const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
    const canvas = createCanvas(size, size);
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
    
    return canvas;
}

// 生成並保存所有尺寸的圖示
const sizes = [16, 48, 128];
sizes.forEach(size => {
    const canvas = generateIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const iconName = `icon${size}.png`;
    fs.writeFileSync(path.join(__dirname, iconName), buffer);
    console.log(`Generated ${iconName}`);
}); 