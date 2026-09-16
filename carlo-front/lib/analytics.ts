export interface AnalyticsConfig { enabled:boolean; collector:string; website:string; domains:string[] }
const routes=new Set(['/','/santos','/mapa','/oraciones','/versiculos','/milagros','/eucaristia','/simbolos','/descubre-tu-santo'])
export function analyticsPath(path:string):string|null {
  const pathname=path.split(/[?#]/,1)[0]
  if(routes.has(pathname))return pathname
  if(/^\/santos\/[^/]+$/.test(pathname))return '/santos/detalle'
  return null
}
export function analyticsPayload(config:AnalyticsConfig,pathname:string,location:{hostname:string},screen:{width:number;height:number},language:string) {
  const url=analyticsPath(pathname)
  if(!config.enabled || !url || !config.domains.includes(location.hostname))return null
  return {type:'event',payload:{website:config.website,hostname:location.hostname,url,referrer:'',screen:`${screen.width}x${screen.height}`,language:language.split('-')[0].slice(0,10)}}
}
