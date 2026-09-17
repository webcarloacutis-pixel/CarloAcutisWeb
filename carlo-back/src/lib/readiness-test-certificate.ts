import { X509Certificate } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Test-only ephemeral key material. Never uses production CA bytes or credentials.
export function temporaryTestCertificate() {
  const directory = mkdtempSync(join(tmpdir(), "acutis-readiness-"));
  const certificatePath = join(directory, "test-ca.crt");
  const keyPath = join(directory, "test-key.pem");
  const gitOpenSsl = "C:/Program Files/Git/usr/bin/openssl.exe";
  const executable = process.platform === "win32" && existsSync(gitOpenSsl) ? gitOpenSsl : "openssl";
  const result = spawnSync(executable, ["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:P-256", "-nodes",
    "-keyout", keyPath, "-out", certificatePath, "-days", "2", "-subj", "/CN=localhost",
    "-addext", "subjectAltName=DNS:localhost", "-addext", "basicConstraints=critical,CA:TRUE"], { stdio: "pipe", timeout: 15000 });
  if (result.status !== 0) throw new Error("TEST_CERTIFICATE_GENERATION_FAILED");
  const certificate = readFileSync(certificatePath);
  return { directory, certificatePath, certificate, key: readFileSync(keyPath),
    fingerprint: new X509Certificate(certificate).fingerprint256,
    cleanup() {
      const target = resolve(directory);
      if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("acutis-readiness-")) throw new Error("UNSAFE_TEST_CLEANUP_PATH");
      rmSync(target, { recursive: true, force: true });
    } };
}
