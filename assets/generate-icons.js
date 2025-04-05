// 創建簡單的圖標 - 這裡使用 Canvas API 生成
function generateIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 縮放所有繪圖操作
    const scale = size / 128;
    ctx.scale(scale, scale);
    
    // 繪製背景
    ctx.fillStyle = '#4285f4';
    ctx.fillRect(0, 0, 128, 128);
    
    // 繪製圖表圖標
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(20, 100);
    ctx.lineTo(40, 60);
    ctx.lineTo(60, 80);
    ctx.lineTo(80, 40);
    ctx.lineTo(100, 20);
    ctx.stroke();
    
    // 繪製網格線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 20; i < 128; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 128);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(128, i);
        ctx.stroke();
    }
    
    // 繪製Excel圖標
    ctx.fillStyle = 'white';
    ctx.fillRect(85, 85, 30, 30);
    ctx.strokeStyle = '#4285f4';
    ctx.lineWidth = 2;
    ctx.strokeRect(85, 85, 30, 30);
    ctx.fillStyle = '#4285f4';
    ctx.font = '20px Arial';
    ctx.fillText('X', 93, 107);
    
    return canvas.toDataURL('image/png');
}

// 將 base64 轉換為 Blob
function dataURLtoBlob(dataURL) {
    const binary = atob(dataURL.split(',')[1]);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: 'image/png'});
}

// 生成並保存所有尺寸的圖示
const sizes = [16, 48, 128];
sizes.forEach(size => {
    const dataURL = generateIcon(size);
    const blob = dataURLtoBlob(dataURL);
    
    // 創建一個臨時的 img 元素來顯示圖示
    const img = document.createElement('img');
    img.src = dataURL;
    img.style.margin = '10px';
    img.style.border = '1px solid #ccc';
    document.body.appendChild(img);
    
    // 保存圖示
    const iconName = `icon${size}.png`;
    const iconPath = `assets/${iconName}`;
    
    // 使用 Blob 創建一個臨時 URL
    const blobURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobURL;
    link.download = iconName;
    link.textContent = `下載 ${iconName}`;
    link.style.display = 'block';
    link.style.margin = '10px';
    document.body.appendChild(link);
});
