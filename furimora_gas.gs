/**
 * Furimora - GAS Backend Script
 *
 * 使い方:
 * 1. Google スプレッドシートを作成します。
 * 2. 「拡張機能」 > 「Apps Script」を開きます。
 * 3. このコードをエディタに貼り付けます。
 * 4. 「デプロイ」 > 「新しいデプロイ」を選択。
 * 5. 種類を「ウェブアプリ」に設定。
 * 6. アクセスできるユーザーを「全員」に設定してデプロイします。
 */

const SPREADSHEET_ID = '11E7cJLSn73jU1oA9mSfr6bDpOKdUd_bbOJqPzVDXahE';

const SHEET_CONFIG = {
  history: {
    name: '履歴',
    headers: ['日付','店舗名','商品名','販売価格','仕入れ原価','手数料','送料','利益額','利益率'],
  },
  inventory: {
    name: 'ストック',
    headers: ['id','name','shopName','buyPrice','targetPrice','memo','addedAt','expectedProfit'],
  },
  stock: {
    name: '在庫',
    headers: ['id','name','shopName','buyPrice','sellPrice','profit','profitRate','status','addedAt','pinned','memo'],
  },
};

// シートを取得または新規作成してヘッダーを設定する
function getOrCreateSheet(ss, type) {
  const config = SHEET_CONFIG[type];
  let sheet = ss.getSheetByName(config.name);
  if (!sheet) {
    sheet = ss.insertSheet(config.name);
    sheet.appendRow(config.headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(config.headers);
  }
  return sheet;
}

// id列でUPSERT（存在すれば更新、なければ追記）
function upsertRow(sheet, headers, item) {
  const idIdx = headers.indexOf('id');
  if (idIdx < 0) return;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues().flat().map(String);
    const pos = ids.indexOf(String(item.id));
    if (pos >= 0) {
      sheet.getRange(pos + 2, 1, 1, headers.length)
        .setValues([headers.map(h => item[h] !== undefined ? item[h] : '')]);
      return;
    }
  }
  sheet.appendRow(headers.map(h => item[h] !== undefined ? item[h] : ''));
}

// id列で行を削除
function deleteRow(sheet, headers, id) {
  const idIdx = headers.indexOf('id');
  if (idIdx < 0) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const ids = sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues().flat().map(String);
  const pos = ids.indexOf(String(id));
  if (pos >= 0) sheet.deleteRow(pos + 2);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = params.action || 'saveHistory';

    if (action === 'saveHistory') {
      // 後方互換: 既存の「シート1」に書き込む
      const sheet = ss.getSheets()[0];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['日付','店舗名','商品名','販売価格','仕入れ原価','手数料','送料','利益額','利益率']);
      }
      sheet.appendRow([
        params.date, params.shopName, params.itemName,
        params.price, params.cost, params.fee,
        params.shipping, params.profit, params.profitRate,
      ]);

    } else if (action === 'upsertInventory') {
      const cfg = SHEET_CONFIG.inventory;
      upsertRow(getOrCreateSheet(ss, 'inventory'), cfg.headers, params.item);

    } else if (action === 'deleteInventory') {
      const cfg = SHEET_CONFIG.inventory;
      deleteRow(getOrCreateSheet(ss, 'inventory'), cfg.headers, params.id);

    } else if (action === 'upsertStock') {
      const cfg = SHEET_CONFIG.stock;
      upsertRow(getOrCreateSheet(ss, 'stock'), cfg.headers, params.item);

    } else if (action === 'deleteStock') {
      const cfg = SHEET_CONFIG.stock;
      deleteRow(getOrCreateSheet(ss, 'stock'), cfg.headers, params.id);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const type = (e && e.parameter && e.parameter.type) || 'history';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (type === 'history') {
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return respond([]);
    const headers = data[0];
    const keyMap = {
      '日付':'date','店舗名':'shopName','商品名':'itemName',
      '販売価格':'price','仕入れ原価':'cost','手数料':'fee',
      '送料':'shipping','利益額':'profit','利益率':'profitRate',
    };
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[keyMap[h] || h] = row[i]; });
      return obj;
    });
    rows.reverse();
    return respond(rows);
  }

  if (type === 'inventory' || type === 'stock') {
    const cfg = SHEET_CONFIG[type];
    const sheet = ss.getSheetByName(cfg.name);
    if (!sheet || sheet.getLastRow() <= 1) return respond([]);
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, cfg.headers.length).getValues();
    const result = rows
      .filter(row => row[0] !== '')
      .map(row => {
        const obj = {};
        cfg.headers.forEach((h, i) => { obj[h] = row[i]; });
        if (obj.pinned !== undefined) obj.pinned = (obj.pinned === true || obj.pinned === 'TRUE');
        return obj;
      });
    result.reverse();
    return respond(result);
  }

  return respond([]);
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
