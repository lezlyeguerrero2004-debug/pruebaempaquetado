document.getElementById('form').addEventListener('submit', async e => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const data = { nombre, fecha: new Date().toISOString() };

  if (!nombre) {
    document.getElementById('estado').textContent = "Por favor escribe un nombre.";
    return;
  }

  if (navigator.onLine) {
    await enviarAlServidor(data);
  } else {
    await guardarPendiente(data);
    document.getElementById('estado').textContent = "Sin conexión, guardado localmente.";
  }

  document.getElementById('form').reset();
});

async function enviarAlServidor(data) {
  try {
    const response = await fetch('api/save.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      document.getElementById('estado').textContent = `Guardado en servidor: ${data.nombre}`;
    } else {
      throw new Error('Error en la respuesta del servidor');
    }
  } catch (err) {
    console.log('Error al enviar, guardando localmente...', err);
    await guardarPendiente(data);
  }
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('transaccionesDB', 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pendientes')) {
        db.createObjectStore('pendientes', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e.target.error);
  });
}

async function guardarPendiente(data) {
  const db = await openDB();
  const tx = db.transaction('pendientes', 'readwrite');
  tx.objectStore('pendientes').add(data);
  await tx.complete;
  db.close();
}

// 🔄 Sincronizar al volver la conexión
window.addEventListener('online', async () => {
  const db = await openDB();
  const tx = db.transaction('pendientes', 'readonly');
  const store = tx.objectStore('pendientes');
  const getAllReq = store.getAll();

  getAllReq.onsuccess = async () => {
    const pendientes = getAllReq.result;
    if (!pendientes || pendientes.length === 0) {
      console.log('No hay pendientes para sincronizar.');
      db.close();
      return;
    }

    for (const item of pendientes) {
      await enviarAlServidor(item);
      const tx2 = db.transaction('pendientes', 'readwrite');
      tx2.objectStore('pendientes').delete(item.id);
      await new Promise(resolve => tx2.oncomplete = resolve);
    }

    document.getElementById('estado').textContent = "Datos sincronizados con el servidor.";
    db.close();
  };
});