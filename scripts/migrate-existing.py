"""Transfer an audited existing-content snapshot without rewriting divergent rows.

Operator-only utility. Requires psycopg2-binary; credentials and evidence stay outside Git.
Prisma remains the authority for schema migrations. No editorial seed is executed.
"""
from pathlib import Path
import argparse, hashlib, json, os, secrets, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = Path(__file__).resolve().parents[1]
if not (ROOT/'carlo-back').exists():
    ROOT = Path(r'C:\Users\sebas\source\CarloAcutisWeb')
sys.path.insert(0, str(ROOT/'.tools/python'))
import psycopg2
from psycopg2 import sql

PROJECT = 'rquzpsjismymbyijwhgj'
ORIGIN = 'https://'+PROJECT+'.supabase.co'
SCHEMA = 'acutis'
BUCKET = 'acutis-catalog'
TABLES = ['Saint','User','Prayer','Miracle','SaintTranslation','MiracleTranslation',
          'PrayerTranslation','Conversation','Message','PopularityEstimate','TranslationCache','CatalogImport']

def canonical(value):
    return json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()

def digest(value): return hashlib.sha256(value).hexdigest()

def read(path): return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def save(path, value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
    temp.replace(path)

def load_snapshot(folder, manifest_file):
    folder=Path(folder);backup=read(folder/'BACKUP_RESULT.json');data=read(folder/'source-rows.json')
    assert backup['restore']=='PASS', 'RESTORATION_PROOF_REQUIRED'
    assert digest((folder/'source.dump').read_bytes())==backup['dumpSha256'], 'BACKUP_CHANGED'
    for table,records in data.items():
        actual=digest(b''.join(canonical(r)+b'\n' for r in sorted(records,key=canonical)))
        assert actual==backup['sourceTables'][table]['sha256'], 'SNAPSHOT_CHANGED'
    manifest=read(manifest_file)
    assert manifest['sourceSnapshot']==backup['run'], 'MANIFEST_SNAPSHOT_MISMATCH'
    ids={row['id'] for row in manifest['entities']}
    assert len(ids)==len(manifest['entities']), 'DUPLICATE_MANIFEST_ID'
    excluded_ids={row['id'] for row in backup['excludedFixtures']}
    assert ids=={row['id'] for row in data['Saint']}-excluded_ids, 'MANIFEST_ALLOWLIST_CHANGED'
    assert len(ids)==backup['catalogTotal'], 'MANIFEST_COUNT_CHANGED'
    selected={table:list(data[table]) for table in TABLES}
    selected['Saint']=[r for r in data['Saint'] if r['id'] in ids]
    assert len(selected['Saint'])==len(ids), 'MISSING_SOURCE_ID'
    hashes={row['id']:row['sha256'] for row in manifest['entities']}
    assert all(digest(canonical(r))==hashes[r['id']] for r in selected['Saint']), 'MANIFEST_CONTENT_CHANGED'
    for table in ['Miracle','SaintTranslation','CatalogImport']:
        selected[table]=[r for r in selected[table] if r.get('saintId') in ids]
    miracles={r['id'] for r in selected['Miracle']}
    selected['MiracleTranslation']=[r for r in selected['MiracleTranslation'] if r['miracleId'] in miracles]
    # Local sessions bind to test/admin secrets and must never become production credentials.
    # Quota/lease/request operational state is backed up, but is not portable authentication/content.
    excluded={table:len(data[table]) for table in ['AuthSession','ApiQuota','AiLease','AiRequest']}
    return backup, data, selected, excluded

def connect_config(config, local=False):
    if local:
        assert config['host']=='127.0.0.1' and config['port']==55439
        assert config['dbname'].startswith('acutis_migration_transfer_')
        return {**config,'connect_timeout':10}
    assert config.get('projectRef')==PROJECT, 'UNEXPECTED_PROJECT'
    host=config['host'];user=config['user']
    direct=host=='db.'+PROJECT+'.supabase.co'
    pooled=host.endswith('.pooler.supabase.com') and user.endswith('.'+PROJECT)
    assert direct or pooled, 'UNEXPECTED_PROJECT_HOST_OR_USER'
    assert config.get('port')==5432 and config.get('dbname')=='postgres', 'SESSION_ENDPOINT_REQUIRED'
    assert config.get('password') and config['password']!='[YOUR-PASSWORD]', 'DATABASE_CREDENTIAL_REQUIRED'
    return {key:value for key,value in {**config,'sslmode':'verify-full','connect_timeout':10}.items()
            if key in ['host','port','dbname','user','password','sslmode','sslrootcert','connect_timeout'] and value}

def target_rows(conn):
    result={}
    with conn.cursor() as cur:
        cur.execute("SET TIME ZONE 'UTC'")
        cur.execute('SET statement_timeout=15000')
        cur.execute('SELECT tablename FROM pg_tables WHERE schemaname=%s',(SCHEMA,))
        names={r[0] for r in cur.fetchall()}
        for table in TABLES+['_prisma_migrations']:
            if table not in names:
                result[table]=[];continue
            cur.execute(sql.SQL('SELECT row_to_json(r) FROM {}.{} r').format(sql.Identifier(SCHEMA),sql.Identifier(table)))
            result[table]=[r[0] for r in cur.fetchall()]
    return result

def compare(selected, existing):
    report={}
    for table,records in selected.items():
        key='identityKey' if table=='CatalogImport' else 'id'
        lookup={r[key]:r for r in existing[table]}
        counts={'source':len(records),'insert':0,'reuse':0,'divergent':[],'otherDestinationRows':len(set(lookup)-{r[key] for r in records})}
        for row in records:
            old=lookup.get(row[key])
            if old is None: counts['insert']+=1
            elif canonical(old)==canonical(row): counts['reuse']+=1
            else: counts['divergent'].append({'id':row[key],'fields':[k for k in set(old)|set(row) if canonical(old.get(k))!=canonical(row.get(k))]})
        report[table]=counts
    return report

def prisma_url(config, local=False):
    query={'schema':SCHEMA,'connection_limit':'1','connect_timeout':'10'}
    if not local:
        query.update(sslmode='require',sslaccept='strict')
        if config.get('sslrootcert'): query['sslcert']=str(Path(config['sslrootcert']).resolve())
    return 'postgresql://'+urllib.parse.quote(config['user'],safe='')+':'+urllib.parse.quote(config['password'],safe='')+'@'+config['host']+':'+str(config['port'])+'/'+config['dbname']+'?'+urllib.parse.urlencode(query)

def prepare_schema(config, existing, private, local=False):
    # Nonempty destinations must have a separately verified logical backup before this step.
    if any(existing.values()): raise RuntimeError('EXISTING_DESTINATION_REQUIRES_REVIEWED_BACKUP_AND_MIGRATION_RECONCILIATION')
    conn=psycopg2.connect(**connect_config(config,local))
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute('''SELECT EXISTS (
                    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=%s
                    UNION ALL
                    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=%s
                    UNION ALL
                    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=%s
                )''',(SCHEMA,SCHEMA,SCHEMA))
                assert not cur.fetchone()[0], 'EXISTING_SCHEMA_OBJECTS_REQUIRE_REVIEWED_BACKUP'
                cur.execute(sql.SQL('CREATE SCHEMA IF NOT EXISTS {}').format(sql.Identifier(SCHEMA)))
                cur.execute(sql.SQL('REVOKE ALL ON SCHEMA {} FROM PUBLIC').format(sql.Identifier(SCHEMA)))
                for api_role in ['anon','authenticated']:
                    cur.execute('SELECT 1 FROM pg_roles WHERE rolname=%s',(api_role,))
                    if cur.fetchone():
                        cur.execute(sql.SQL('REVOKE ALL ON SCHEMA {} FROM {}').format(sql.Identifier(SCHEMA),sql.Identifier(api_role)))
    finally: conn.close()
    runtime=ROOT/'.tools/node-v24.21.0-win-x64/node.exe'
    node=str(runtime) if runtime.exists() else 'node'
    env={**os.environ,'DATABASE_URL':prisma_url(config,local),'DIRECT_URL':prisma_url(config,local)}
    result=subprocess.run([node,'node_modules/prisma/build/index.js','migrate','deploy'],cwd=ROOT/'carlo-back',env=env,capture_output=True,timeout=180)
    # Prisma can include connection details; diagnostics are deliberately kept private.
    (private/'prisma-maintenance.log').write_bytes(result.stdout+result.stderr)
    if result.returncode: raise RuntimeError('PRISMA_MAINTENANCE_FAILED_SEE_PRIVATE_LOG')

def prepare_role(config, private, local=False):
    conn=psycopg2.connect(**connect_config(config,local))
    role='acutis_app' if not local else config['dbname']+'_app'
    secret_file=private/'runtime-connection.json'
    existing_secret=read(secret_file) if secret_file.exists() else None
    password=existing_secret['password'] if existing_secret else secrets.token_urlsafe(40)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute('SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=%s',(role,))
                old=cur.fetchone()
                if old:
                    assert existing_secret and not any(old), 'EXISTING_ROLE_REQUIRES_REVIEW_NO_PASSWORD_OVERWRITE'
                else:
                    cur.execute(sql.SQL('CREATE ROLE {} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %s').format(sql.Identifier(role)),(password,))
                cur.execute(sql.SQL('GRANT CONNECT ON DATABASE {} TO {}').format(sql.Identifier(config['dbname']),sql.Identifier(role)))
                cur.execute(sql.SQL('REVOKE ALL ON SCHEMA {} FROM PUBLIC').format(sql.Identifier(SCHEMA)))
                cur.execute(sql.SQL('GRANT USAGE ON SCHEMA {} TO {}').format(sql.Identifier(SCHEMA),sql.Identifier(role)))
                api_roles=['PUBLIC']
                for api_role in ['anon','authenticated']:
                    cur.execute('SELECT 1 FROM pg_roles WHERE rolname=%s',(api_role,))
                    if cur.fetchone():
                        api_roles.append(api_role)
                        cur.execute(sql.SQL('REVOKE ALL ON SCHEMA {} FROM {}').format(sql.Identifier(SCHEMA),sql.Identifier(api_role)))
                for table in TABLES+['AuthSession','ApiQuota','AiLease','AiRequest']:
                    ident=sql.Identifier(SCHEMA,table)
                    for api_role in api_roles:
                        grantee=sql.SQL('PUBLIC') if api_role=='PUBLIC' else sql.Identifier(api_role)
                        cur.execute(sql.SQL('REVOKE ALL ON TABLE {} FROM {}').format(ident,grantee))
                    cur.execute(sql.SQL('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {} TO {}').format(ident,sql.Identifier(role)))
                for api_role in api_roles:
                    grantee=sql.SQL('PUBLIC') if api_role=='PUBLIC' else sql.Identifier(api_role)
                    cur.execute(sql.SQL('ALTER DEFAULT PRIVILEGES IN SCHEMA {} REVOKE ALL ON TABLES FROM {}').format(sql.Identifier(SCHEMA),grantee))
                cur.execute(sql.SQL('ALTER DEFAULT PRIVILEGES IN SCHEMA {} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {}').format(sql.Identifier(SCHEMA),sql.Identifier(role)))
                # _prisma_migrations stays maintenance-only. No DDL grants are given.
    finally: conn.close()
    runtime={**config,'user':role+('.'+PROJECT if config['host'].endswith('.pooler.supabase.com') else ''),'password':password}
    save(secret_file,runtime)
    runtime_conn=psycopg2.connect(**connect_config(runtime,local))
    try:
        with runtime_conn.cursor() as cur:
            cur.execute('SELECT current_user, has_schema_privilege(current_user,%s,\'CREATE\'), has_schema_privilege(current_user,%s,\'USAGE\')',(SCHEMA,SCHEMA))
            name,create,usage=cur.fetchone();assert name==role and not create and usage
            cur.execute(sql.SQL('SELECT count(*) FROM {}.{}').format(sql.Identifier(SCHEMA),sql.Identifier('Saint')))
            cur.fetchone()
    finally: runtime_conn.close()

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): raise RuntimeError('UNEXPECTED_STORAGE_REDIRECT')

def storage_request(path, secret, method='GET', body=None, content_type='application/json', max_bytes=20*1024*1024):
    assert path.startswith('/storage/v1/') and '..' not in path
    headers={'apikey':secret,'Content-Type':content_type}
    if not secret.startswith('sb_secret_'): headers['Authorization']='Bearer '+secret
    opener=urllib.request.build_opener(NoRedirect())
    for attempt in range(3):
        try:
            request=urllib.request.Request(ORIGIN+path,data=body,method=method,headers=headers)
            with opener.open(request,timeout=30) as response:
                data=response.read(max_bytes+1)
                if len(data)>max_bytes: raise RuntimeError('STORAGE_RESPONSE_TOO_LARGE')
                return response.status,data
        except urllib.error.HTTPError as error:
            if error.code in [400,404]:
                data=error.read(65537)
                # Storage uses 400 with a structured 404 for missing objects.
                try: missing=str(json.loads(data).get('statusCode'))=='404'
                except (ValueError,TypeError): missing=False
                if error.code==404 or missing: return 404,b''
            if error.code not in [429,500,502,503,504] or attempt==2:
                raise RuntimeError('STORAGE_HTTP_'+str(error.code)) from None
        except urllib.error.URLError:
            if attempt==2: raise RuntimeError('STORAGE_NETWORK_FAILED') from None
        time.sleep(2**attempt)
    raise RuntimeError('STORAGE_RETRY_LIMIT')

def transfer_storage(config, manifest, evidence_root, private, execute):
    secret=config.get('storageSecret')
    assert secret, 'STORAGE_SERVER_CREDENTIAL_REQUIRED'
    status,body=storage_request('/storage/v1/bucket/'+BUCKET,secret)
    if status==404:
        if execute:
            storage_request('/storage/v1/bucket',secret,'POST',canonical({'id':BUCKET,'name':BUCKET,'public':True,'file_size_limit':20*1024*1024,'allowed_mime_types':['image/webp']}))
    else:
        bucket=json.loads(body);assert bucket.get('public') is True, 'BUCKET_VISIBILITY_CONFLICT'
    records=[]
    for item in manifest['objects']:
        assert item['sourceVisibility']=='public' and item['mime']=='image/webp'
        local=(evidence_root/item['backup']).resolve()
        assert local.is_relative_to(evidence_root.resolve()), 'BACKUP_PATH_ESCAPE'
        data=local.read_bytes();assert digest(data)==item['sha256'] and len(data)==item['bytes']
        assert data[:4]==b'RIFF' and data[8:12]==b'WEBP', 'INVALID_EXISTING_WEBP'
        key=item['sourceUrl'].removeprefix('/catalog/')
        assert not key.startswith('/') and '..' not in key and '\\' not in key
        path='/storage/v1/object/'+BUCKET+'/'+urllib.parse.quote(key,safe='/')
        state,old=storage_request(path,secret)
        if state!=404 and digest(old)!=item['sha256']: raise RuntimeError('STORAGE_CONTENT_CONFLICT: '+key)
        outcome='reused' if state!=404 else 'pending'
        if state==404 and execute:
            storage_request(path,secret,'POST',data,item['mime'])
            state,old=storage_request(path,secret)
            assert state==200 and digest(old)==item['sha256'],'STORAGE_VERIFICATION_FAILED'
            outcome='uploaded'
        if execute:
            state,public=storage_request('/storage/v1/object/public/'+BUCKET+'/'+urllib.parse.quote(key,safe='/'),secret)
            assert state==200 and digest(public)==item['sha256'], 'PUBLIC_STORAGE_VERIFICATION_FAILED'
        records.append({**item,'bucket':BUCKET,'objectKey':key,'state':outcome})
        save(private/'STORAGE_TRANSFER.json',{'project':PROJECT,'objects':records})
    return records

def import_rows(conn, selected, private, execute=False):
    existing=target_rows(conn);preview=compare(selected,existing)
    save(private/'SQL_PREVIEW.json',preview)
    if any(row['divergent'] for row in preview.values()): raise RuntimeError('DESTINATION_CONTENT_CONFLICT_SEE_PRIVATE_PREVIEW')
    if not execute: return preview
    for table,records in selected.items():
        key='identityKey' if table=='CatalogImport' else 'id'
        for offset in range(0,len(records),20):
            with conn:
                with conn.cursor() as cur:
                    cur.execute('SET LOCAL lock_timeout=5000')
                    for row in records[offset:offset+20]:
                        ident=sql.Identifier(SCHEMA,table)
                        cur.execute(sql.SQL('SELECT row_to_json(r) FROM {} r WHERE {}=%s FOR UPDATE').format(ident,sql.Identifier(key)),(row[key],))
                        old=cur.fetchone()
                        if old:
                            if canonical(old[0])!=canonical(row): raise RuntimeError('CONCURRENT_DESTINATION_CONFLICT')
                            continue
                        columns=sql.SQL(',').join(sql.Identifier(k) for k in row)
                        cur.execute(sql.SQL('INSERT INTO {} ({}) SELECT {} FROM json_populate_record(NULL::{},%s::json) ON CONFLICT DO NOTHING').format(ident,columns,columns,ident),(canonical(row).decode(),))
                        cur.execute(sql.SQL('SELECT row_to_json(r) FROM {} r WHERE {}=%s').format(ident,sql.Identifier(key)),(row[key],))
                        copied=cur.fetchone()
                        assert copied and canonical(copied[0])==canonical(row), 'INSERT_CONFLICT_OR_CONTENT_MISMATCH'
            save(private/'CHECKPOINT.json',{'table':table,'processed':min(offset+20,len(records))})
    after=compare(selected,target_rows(conn))
    assert all(r['insert']==0 and not r['divergent'] for r in after.values()), 'TRANSFER_VERIFICATION_FAILED'
    save(private/'SQL_VERIFIED.json',after)
    return preview

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--snapshot',required=True);parser.add_argument('--manifest',required=True)
    parser.add_argument('--config',required=True);parser.add_argument('--output',required=True)
    parser.add_argument('--prepare',action='store_true');parser.add_argument('--execute',action='store_true')
    parser.add_argument('--local-rehearsal',action='store_true')
    args=parser.parse_args();private=Path(args.output);private.mkdir(parents=True,exist_ok=True)
    config=read(args.config)
    backup,source,selected,excluded=load_snapshot(args.snapshot,args.manifest)
    connection=connect_config(config,args.local_rehearsal)
    conn=psycopg2.connect(**connection)
    try:
        conn.set_session(readonly=True)
        existing=target_rows(conn);conn.rollback()
        save(private/'DESTINATION_BEFORE.json',{'project':PROJECT if not args.local_rehearsal else 'LOCAL_REHEARSAL','tables':{t:len(r) for t,r in existing.items()}})
        if args.prepare:
            conn.close();prepare_schema(config,existing,private,args.local_rehearsal)
            conn=psycopg2.connect(**connection)
            existing=target_rows(conn);conn.rollback()
        expected={r['migration_name']:r['checksum'] for r in source['_prisma_migrations']}
        actual={r['migration_name']:r['checksum'] for r in existing['_prisma_migrations'] if r['finished_at'] and not r['rolled_back_at']}
        if actual!=expected: raise RuntimeError('PRISMA_MIGRATION_HISTORY_NOT_RECONCILED')
        conn.set_session(readonly=not args.execute)
        preview=import_rows(conn,selected,private,False)
        conn.rollback()
        storage=[]
        if args.execute:
            # Restrict public access before inserting any content, including on resumed runs.
            prepare_role(config,private,args.local_rehearsal)
        if not args.local_rehearsal:
            evidence_root=Path(args.manifest).resolve().parent
            storage=transfer_storage(config,read(evidence_root/'STORAGE_MANIFEST.json'),evidence_root,private,args.execute)
        if args.execute:
            first=import_rows(conn,selected,private,True)
            second=import_rows(conn,selected,private,True)
            assert all(r['insert']==0 and not r['divergent'] for r in second.values()),'IDEMPOTENCE_FAILED'
            conn.close();prepare_role(config,private,args.local_rehearsal)
        else: first=preview;second=None
        report={'project':PROJECT if not args.local_rehearsal else 'LOCAL_REHEARSAL','schema':SCHEMA,
                'sourceSnapshot':backup['run'],'executed':args.execute,'tables':first,'secondRun':second,
                'excludedLocalOperationalRows':excluded,'newEditorialContent':0,'storageObjects':len(storage)}
        save(private/'MIGRATION_RESULT.json',report)
        print(json.dumps({'executed':args.execute,'target':report['project'],'tables':first,'idempotent':bool(second),'newEditorialContent':0}))
    finally: conn.close()

if __name__=='__main__':
    try: main()
    except Exception as error:
        # No driver traceback/DSN or remote response body on stdout.
        safe=str(error) if isinstance(error,(AssertionError,RuntimeError)) else type(error).__name__
        print(json.dumps({'result':'BLOCKED','reason':safe}),file=sys.stderr)
        sys.exit(1)
