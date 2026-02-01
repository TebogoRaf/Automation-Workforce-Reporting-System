// db.js - AWMS IndexedDB helpers for employees, tasks, performance
(function(window){
  function openAwmsDb(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open('awms-data', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('employees')) db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('performance')) db.createObjectStore('performance', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }

  async function add(storeName, obj){
    const db = await openAwmsDb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(storeName,'readwrite');
      const store = tx.objectStore(storeName);
      const r = store.add(obj);
      r.onsuccess = ()=>resolve(r.result);
      r.onerror = ()=>reject(r.error);
    });
  }
  async function getAll(storeName){
    const db = await openAwmsDb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(storeName,'readonly');
      const store = tx.objectStore(storeName);
      const r = store.getAll();
      r.onsuccess = ()=>resolve(r.result);
      r.onerror = ()=>reject(r.error);
    });
  }
  async function del(storeName, id){
    const db = await openAwmsDb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(storeName,'readwrite');
      const store = tx.objectStore(storeName);
      const r = store.delete(id);
      r.onsuccess = ()=>resolve();
      r.onerror = ()=>reject(r.error);
    });
  }
  async function clear(storeName){
    const db = await openAwmsDb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(storeName,'readwrite');
      const store = tx.objectStore(storeName);
      const r = store.clear();
      r.onsuccess = ()=>resolve();
      r.onerror = ()=>reject(r.error);
    });
  }

  window.awmsDB = {
    addEmployee: (obj)=> add('employees', obj),
    getEmployees: ()=> getAll('employees'),
    deleteEmployee: (id)=> del('employees', id),
    addTask: (obj)=> add('tasks', obj),
    getTasks: ()=> getAll('tasks'),
    deleteTask: (id)=> del('tasks', id),
    addPerformance: (obj)=> add('performance', obj),
    getPerformance: ()=> getAll('performance'),
    deletePerformance: (id)=> del('performance', id),
    clear: clear
  };

  // connectivity checker: dispatches 'awms:online' / 'awms:offline' events
  async function checkOnline(){
    let online = navigator.onLine;
    if (online){
      try { const r = await fetch('/health'); online = r.ok; } catch(e){ online = false; }
    }
    window.dispatchEvent(new CustomEvent(online? 'awms:online':'awms:offline'));
  }
  window.addEventListener('online', checkOnline);
  window.addEventListener('offline', checkOnline);
  setTimeout(checkOnline, 300);

})(window);