export type MapPoint = { id: string; lat: number; lng: number; label: string; title: string };

/**
 * A self-contained MapLibre page (same OpenFreeMap "bright" style as uykor.uz).
 * Talks to the app through postMessage: it sends the id of a tapped pin,
 * and the app calls window.uykorSet(points, selectedId) to redraw.
 */
export function mapHtml(opts: { points: MapPoint[]; selected?: string | null; lang: 'uz' | 'ru'; interactive?: boolean; zoom?: number }) {
  const init = JSON.stringify({ points: opts.points, selected: opts.selected ?? null, lang: opts.lang, interactive: opts.interactive !== false, zoom: opts.zoom ?? 13 });
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css" rel="stylesheet">
<script src="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js"></script>
<style>
html,body,#m{margin:0;height:100%;background:#EAEFE8;font-family:-apple-system,Roboto,sans-serif}
.pin{background:#fff;color:#14213D;border:1px solid #C3CBD9;border-radius:999px;padding:5px 10px;font:700 13px/1.2 -apple-system,Roboto,sans-serif;white-space:nowrap;box-shadow:0 2px 8px rgba(20,33,61,.18);transform:translate(-50%,-100%);cursor:pointer}
.pin.on{background:#2346A0;color:#fff;border:2px solid #fff;box-shadow:0 6px 18px rgba(35,70,160,.4)}
.maplibregl-ctrl-attrib{font-size:10px}
</style></head><body><div id="m"></div><script>
var S=${init};
function send(id){var msg=JSON.stringify({type:'select',id:id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);else if(window.parent!==window)window.parent.postMessage(msg,'*');}
var LABEL=S.lang==='ru'?['coalesce',['get','name:ru'],['get','name'],['get','name_int']]:['coalesce',['get','name:uz'],['get','name_int'],['get','name:latin'],['get','name']];
var first=S.points[0];
var map=new maplibregl.Map({container:'m',style:'https://tiles.openfreemap.org/styles/bright',center:first?[first.lng,first.lat]:[66.9597,39.6542],zoom:S.zoom-0.5,interactive:S.interactive,attributionControl:{compact:true}});
map.touchZoomRotate&&map.touchZoomRotate.disableRotation();map.dragRotate&&map.dragRotate.disable();
map.on('style.load',function(){map.getStyle().layers.forEach(function(l){if(l.type==='symbol'&&map.getLayoutProperty(l.id,'text-field')!==undefined){try{map.setLayoutProperty(l.id,'text-field',LABEL)}catch(e){}}});});
var markers=[];
function draw(fit){markers.forEach(function(m){m.remove()});markers=S.points.map(function(p){var on=p.id===S.selected;var w=document.createElement('div');var b=document.createElement('div');b.className='pin'+(on?' on':'');b.textContent=p.label;b.title=p.title;b.onclick=function(e){e.stopPropagation();send(p.id)};w.appendChild(b);w.style.zIndex=on?2:1;return new maplibregl.Marker({element:w,anchor:'top-left'}).setLngLat([p.lng,p.lat]).addTo(map);});
if(fit&&S.points.length>1&&!S.selected){var bd=new maplibregl.LngLatBounds();S.points.forEach(function(p){bd.extend([p.lng,p.lat])});map.fitBounds(bd,{padding:60,maxZoom:14,duration:0});}
var s=S.points.filter(function(p){return p.id===S.selected})[0];if(s)map.easeTo({center:[s.lng,s.lat],duration:400});}
window.uykorSet=function(points,selected){var fit=JSON.stringify(points.map(function(p){return p.id}))!==JSON.stringify(S.points.map(function(p){return p.id}));S.points=points;S.selected=selected;draw(fit);};
window.addEventListener('message',function(e){try{var d=typeof e.data==='string'?JSON.parse(e.data):e.data;if(d&&d.type==='set')window.uykorSet(d.points,d.selected)}catch(x){}});
map.on('load',function(){draw(true)});
</script></body></html>`;
}
