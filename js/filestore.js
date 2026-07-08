/* =========================================================
   filestore — 파일(Blob)을 브라우저 IndexedDB 에 임시 저장
   - localStorage 는 용량(약 5MB) 제한이 있어 큰 파일에 부적합 → IndexedDB 사용
   - 나중에 서버가 생기면 put/get 내부만 서버 API(fetch)로 교체
   - 사용법:
       await FileStore.put('shop', file)      // 저장
       var blob = await FileStore.get('shop') // 불러오기
       await FileStore.del('shop')            // 삭제
   ========================================================= */
window.FileStore = (function () {
  var DB_NAME = 'training_files';
  var STORE = 'files';
  var _db = null;

  function open() {
    return new Promise(function (resolve, reject) {
      if (_db) return resolve(_db);
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var request = fn(store);
        t.oncomplete = function () { resolve(request && request.result); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  return {
    put: function (key, blob) { return tx('readwrite', function (s) { return s.put(blob, key); }); },
    get: function (key) { return tx('readonly',  function (s) { return s.get(key); }); },
    del: function (key) { return tx('readwrite', function (s) { return s.delete(key); }); },
  };
})();
