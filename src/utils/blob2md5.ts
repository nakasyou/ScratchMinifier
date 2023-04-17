export default function blob2md5(blob: Blob): Promise<string>{
  return new Promise((resolve)=>{
    const reader = new FileReader();
    reader.readAsBinaryString(blob);
    reader.onloadend = ()=>resolve(CryptoJS.MD5(reader.result).toString());
  });
}
