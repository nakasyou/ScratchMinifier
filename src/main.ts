import './style.css';
document.getElementById("minify").addEventListener("click",(e)=>{
  for(const element of document.getElementsByClassName("info")){
    element.textContent = "None";
  }
  document.getElementById("download").textContent = "";
  if(document.getElementById("open-sb3").files.length===0){
    alert("ファイルを指定してください");
    return;
  }
  
  document.getElementById("minifying").hidden = false;
  main(document.getElementById("open-sb3").files[0])
  .then(()=>{
    document.getElementById("minifying").hidden = true;
  });

});
const $whatAreYouDoing = document.getElementById("what-are-you-doing");

function main(sb3){
  return new Promise((resolve)=>{
    $whatAreYouDoing.textContent = "解凍中";
    document.getElementById("minify-progress").hidden = true;
    jz.zip.unpack({
      buffer: sb3,
      encoding: 'UTF_8',
    })
    .then(async reader=>{
      $whatAreYouDoing.textContent = "解析中";
      document.getElementById("raw-size").textContent = reader.blob.size;
      const blobs = await Promise.all(reader.getFileNames().map(file=>reader.readFileAsBlob(file)));
      const names = reader.getFileNames();
      const result = {};
      names.forEach((name,index)=>{result[name]=blobs[index]});
      $whatAreYouDoing.textContent = "削減中";
      document.getElementById("minify-progress").hidden = false;
      document.getElementById("minify-progress").value = 0;
      return result;
    })
    .then(minify)
    .then(async data=>{
      const names = Object.keys(data);
      const blobs = Object.values(data);
      const buffers = await Promise.all(blobs.map(d=>d.arrayBuffer()));
      const files = names.map((name,index)=>({ name, buffer: buffers[index]}));
      return jz.zip.pack({
        files: files,
        level: 9
      });
    })
    .then(data=>{
      const sb3Blob = new Blob([data]);
      document.getElementById("min-size").textContent = sb3Blob.size;
      document.getElementById("ratio").textContent = Math.round(10000 - sb3Blob.size / parseInt(document.getElementById("raw-size").textContent) * 10000) /100;
      const url = URL.createObjectURL(sb3Blob);
      const dl = document.createElement("a");
      dl.download = "minifyed.sb3";
      dl.href = url;
      dl.textContent = "Save!";
      dl.className = "btn";
      document.getElementById("download").append(dl);
    })
    .then(resolve)
    .catch(error=>{
      switch (error.message) {
        case 'zip.unpack: invalid zip file.':
          alert("sb3ファイルとして正しくありません。")
          break;
        default:
          console.error(e);
      }
      resolve();
    });
  });
}
import svg2png from "./utils/svg2png.ts";
import blob2md5 from "./utils/blob2md5.ts";

async function minify(data){
  const max = getMax(JSON.parse(await data["project.json"].text()))
  document.getElementById("minify-progress").max = max;
  const tocostume = {};
  if(getoptions("svg2png")){
  for(const name of Object.keys(data)){
    if(name.slice(-4)!==".svg") continue;
      const svg = data[name];
      const png = await svg2png(svg);
      if(svg.size>png.size){
        const newName = await blob2md5(png);
        const oldName = name;
        tocostume[oldName] = {
          dataFormat: "png",
          assetId: newName,
          md5ext: newName+".png",
        };
        delete data[oldName];
        data[newName+".png"] = png;
      }
    }
  }
  data["project.json"] = await jsonMinify(data["project.json"],{
    tocostume,
  });
  return data;
}
class Ids{
  constructor(){
    this.datas = {};
    this.ids = {};
  }
  add(name){
    this.datas[name] = 0;
    this.ids[name] = {};
  }
  get(name){
    this.datas[name] += 1;
    return this.tostr(this.datas[name]);
  }
  getFromId(name,id){
    if(!Object.keys(this.ids[name]).includes(id)){
      this.ids[name][id] = this.get(name);
    }
    return this.ids[name][id];
  }
  tostr(dec){
    return dec.toString(36);
  }
}

function getoptions(id){
  return document.querySelector(`#options #${id}`).checked;
}
function removeBlock(blocks,id){
  const ids = [id];
  while(true){
    const id = ids.shift();
    const block = blocks[id];
    const { inputs } = block;
    for(const inputKey of Object.keys(inputs)){
      const input = inputs[inputKey];
      if(typeof input[1] === "string"){
        ids.push(input[1]);
      }
    }
    delete blocks[id];
    if(ids.length === 0){
      break
    }
  }
}
function getMax(project){
  let result = 0;
  project.targets.forEach(target=>{
    result += Object.keys(target.variables).length;
    result += Object.keys(target.blocks).length;
  })
  return result;
}
async function jsonMinify(project,subdata){
  const $progress = document.getElementById("minify-progress");
  const upProgress = ()=>{
    $progress.value++;
    $progress.textContent = $progress.value +" / "+ $progress.max;
  };
  const { tocostume } = subdata;
  const data = JSON.parse(await project.text());
  const ids = new Ids();
  ids.add("variables");
  ids.add("lists");
  ids.add("defines");
  ids.add("costumes");
  const options = {
    removeVarValue: getoptions("removeVarValue"),
    removeListValue: getoptions("removeListValue"),
    removeNotConnectBlocks: getoptions("removeNotConnectBlocks"),
    svg2png: getoptions("svg2png"),
    removeComment: getoptions("removeComment"),
  }
  data.targets.map(sprite=>{
    const { variables, lists, blocks, costumes } = sprite;
    // costumes
    for(const costume of costumes){
      //costume.name = ids.get("costumes");
      if(costume.md5ext in tocostume && options.svg2png){
        Object.assign(costume,tocostume[costume.md5ext]);
      }
    }
    // variables
    for(const id of Object.keys(variables)){
      upProgress();
      variables[id][0] = ids.get("variables");
      if(options.removeVarValue)
        variables[id][1] = "";
    }
    // lists
    for(const id of Object.keys(lists)){
      lists[id][0] = ids.get("lists");
      if(options.removeListValue)
        lists[id][1] = [];
    }
    // blocks
    for(const id of Object.keys(blocks)){
      upProgress()
      const block = blocks[id];
      if(!block){
        continue;
      }
      if("x" in block && "y" in block){
        block.x = 0;
        block.y = 0;
      }
      /*if("mutation" in block){
        block.mutation.proccode = ids.getFromId("defines",block.mutation.proccode);
      }*/
      if(block.topLevel && !block.next && options.removeNotConnectBlocks){
        removeBlock(blocks,id);
        continue;
      }
    }
    // comments
    if(options.removeComment){
      sprite.comments = {};
    }
    //console.log(sprite)
  });
  return new Blob([JSON.stringify(data)], { type: "application/json" });
}
