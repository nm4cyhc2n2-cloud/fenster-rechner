(() => {
  'use strict';
  const COUNT = 10;
  const STORAGE_KEY = 'fenster-rechner-data-v1';
  const options = ['Fenster 1', 'Fenster 2', 'Fenster 3', 'Fenster 4', 'Fenster 5'];
  const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  const emptyRows = () => Array.from({length: COUNT}, () => ({window: '', amount: '', price: '10'}));

  function readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!Array.isArray(saved) || saved.length !== COUNT) return emptyRows();
      return saved.map(row => ({
        window: options.includes(row?.window) ? row.window : '',
        amount: typeof row?.amount === 'string' ? row.amount.slice(0, 12) : '',
        price: typeof row?.price === 'string' ? row.price.slice(0, 16) : '10'
      }));
    } catch { return emptyRows(); }
  }

  let data = readSaved();
  const container = document.getElementById('rows');
  const totalEl = document.getElementById('grand-total');
  const validationEl = document.getElementById('validation-message');
  const saveStatusEl = document.getElementById('save-status');
  const rendered = [];

  function makeInput(inputMode, label, value, limit) {
    const field = document.createElement('input');
    field.type = 'text';
    field.inputMode = inputMode;
    field.autocomplete = 'off';
    field.spellcheck = false;
    field.setAttribute('aria-label', label);
    field.maxLength = limit;
    field.value = value;
    return field;
  }

  function drawRows() {
    container.replaceChildren();
    rendered.length = 0;
    data.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'calc-row table-grid';
      const selector = document.createElement('select');
      selector.setAttribute('aria-label', `Fenstertyp, Zeile ${index+1}`);
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'Auswählen';
      selector.append(blank);
      options.forEach(text => {
        const option = document.createElement('option');
        option.value = option.textContent = text;
        selector.append(option);
      });
      selector.value = item.window;
      const amount = makeInput('numeric', `Anzahl, Zeile ${index+1}`, item.amount, 12);
      amount.placeholder = '0';
      const price = makeInput('decimal', `Preis in Euro, Zeile ${index+1}`, item.price, 16);
      price.placeholder = '10';
      const result = document.createElement('output');
      result.className = 'result empty';
      result.setAttribute('aria-label', `Ergebnis, Zeile ${index+1}`);
      row.append(selector, amount, price, result);
      container.append(row);
      rendered.push({selector, amount, price, result});

      selector.addEventListener('change', () => { data[index].window = selector.value; save(); calculate(); });
      amount.addEventListener('input', () => { data[index].amount = amount.value; save(); calculate(); });
      price.addEventListener('input', () => { data[index].price = price.value; save(); calculate(); });
    });
    calculate();
  }

  function euroCents(raw) {
    const clean = raw.replace(/[\s€]/g, '').trim();
    if (!/^\d{1,9}(?:[.,]\d{1,2})?$/.test(clean)) return null;
    const [whole, decimals = ''] = clean.replace(',', '.').split('.');
    return Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  }

  function calculate() {
    let sumCents = 0;
    let invalid = false;
    data.forEach((item, i) => {
      const {amount, price, result} = rendered[i];
      amount.classList.remove('invalid');
      price.classList.remove('invalid');
      result.className = 'result';
      const quantityText = item.amount.trim();
      if (quantityText === '') {
        result.textContent = '–';
        result.classList.add('empty');
        return;
      }
      const count = /^\d{1,9}$/.test(quantityText) ? Number(quantityText) : null;
      const cents = euroCents(item.price);
      if (count === null || cents === null || count * cents > Number.MAX_SAFE_INTEGER) {
        invalid = true;
        if (count === null) amount.classList.add('invalid');
        if (cents === null) price.classList.add('invalid');
        result.textContent = 'Prüfen';
        result.classList.add('error');
        return;
      }
      const rowCents = count * cents;
      sumCents += rowCents;
      result.textContent = money.format(rowCents / 100);
    });
    totalEl.textContent = money.format(sumCents / 100);
    validationEl.hidden = !invalid;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      saveStatusEl.textContent = 'Eingaben werden automatisch gespeichert';
    } catch {
      saveStatusEl.textContent = 'Speicherung im Browser nicht verfügbar';
    }
  }

  document.getElementById('reset-button').addEventListener('click', () => {
    if (!window.confirm('Alle 10 Positionen wirklich zurücksetzen?')) return;
    data = emptyRows();
    save();
    drawRows();
  });

  drawRows();

  const offlineStatus = document.getElementById('offline-status');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('./sw.js', {scope:'./'});
        await navigator.serviceWorker.ready;
        offlineStatus.textContent = 'Offline-Nutzung bereit';
      } catch {
        offlineStatus.textContent = 'Offline-Modus derzeit nicht verfügbar';
      }
    });
  } else {
    offlineStatus.textContent = 'Offline nach Veröffentlichung über HTTPS';
  }
})();
