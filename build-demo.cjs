const fs=require('node:fs'),path=require('node:path');
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(tag,file)=>{
  if(/^https?:/.test(file))return tag;
  return '<script>'+fs.readFileSync(path.join(__dirname,file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>';
});
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(tag,file)=>/^https?:/.test(file)?tag:'<style>'+fs.readFileSync(path.join(__dirname,file),'utf8')+'</style>');
const output=path.join(__dirname,'..','FundPath - Michael + Jeff.html');fs.writeFileSync(output,html);
console.log('Updated standalone FundPath preview with three club presets and embedded source attachments.');
