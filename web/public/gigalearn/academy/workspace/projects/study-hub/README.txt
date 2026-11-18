GigaLearn Academy — My Study Hub

1. Extract all files into one folder.
2. For the first HTML exercise, open index.html and test Start Learning.
3. Personalise the heading, colour and response message.
4. For PWA testing, serve this folder through HTTPS or localhost.
   If Python 3 is installed: python3 -m http.server 8000
   Then open http://localhost:8000/ in your browser.
5. Inspect Application > Manifest and Service Workers in browser developer tools.
   Wait for activation, then reload so the worker controls the page.
6. Disconnect and reload. Check the heading and working button offline.
7. Test installation separately on a supported browser; availability varies.
8. Check keyboard navigation, narrow screens and the browser console.

The worker scope is this project folder. It caches only the listed starter files.
This starter does not implement accounts, synchronisation or offline databases.
Bump the cache name when you change the precached files. Keep the prefix unique.
Never deploy secret keys or private learner information in client-side files.
