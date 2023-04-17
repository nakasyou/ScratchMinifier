export default function svg2png(svgBlob: Blob): Blob{
  const img = new Image();
  return new Promise((resolve)=>{
    const loaded = () => {
      const canvas = document.createElement('canvas');
      
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const dataURL = canvas.toDataURL('image/png');
      fetch(dataURL)
      .then(res=>res.blob())
      .then(resolve);
    };
    svgBlob = new Blob([svgBlob],{
      type: "image/svg+xml",
    });
    img.onload = loaded;
    img.src = URL.createObjectURL(svgBlob);
  });
}
