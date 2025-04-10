// 此函数用于注册Service Worker
export function register() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        const swUrl = `${process.env.PUBLIC_URL}/serviceWorker.js`;
        
        navigator.serviceWorker
          .register(swUrl)
          .then(registration => {
            console.log('ServiceWorker注册成功:', registration);
          })
          .catch(error => {
            console.error('ServiceWorker注册失败:', error);
          });
      });
    }
  }
  
  // 此函数用于注销Service Worker
  export function unregister() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(registration => {
          registration.unregister();
        })
        .catch(error => {
          console.error(error.message);
        });
    }
  }