function chatStream() {
  return new Promise((resolve) => {
    const stream = new ReadableStream({
      start(controller) {
        const data = [
          { event: 'cmpl', idx_s: 0, idx_z: 0, text: '可' },
          { event: 'cmpl', idx_s: 0, idx_z: 0, text: '以' },
          { event: 'cmpl', idx_s: 0, idx_z: 0, text: '考' },
          { event: 'cmpl', idx_s: 0, idx_z: 0, text: '虑' }
        ];

        let index = 0;

        const interval = setInterval(() => {
          if (index < data.length) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(data[index]) + '\n'));
            index++;
          } else {
            clearInterval(interval);
            controller.close();
            resolve();
          }
        }, 100);
      }
    });

    const reader = stream.getReader();
    const readStream = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        console.log(new TextDecoder().decode(value));
      }
    };

    readStream();
  });
}

// 测试 chatStream 函数
chatStream().then(() => {
  console.log('Stream completed');
});