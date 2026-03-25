/**
 * Furimora - GAS Backend Script
 * 
 * 使い方:
 * 1. Google スパレットシートを作成します。
 * 2. 「拡張機能」 > 「Apps Script」を開きます。
 * 3. このコードをエディタに貼り付けます。
 * 4. 「デプロイ」 > 「新しいデプロイ」を選択。
 * 5. 種類を「ウェブアプリ」に設定。
 * 6. アクセスできるユーザーを「全員」に設定してデプロイします。
 */

const SPREADSHEET_ID = '11E7cJLSn73jU1oA9mSfr6bDpOKdUd_bbOJqPzVDXahE';

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0]; // 最初のシートを使用
    
    // ヘッダーがない場合は作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["日付", "店舗名", "商品名", "販売価格", "仕入れ原価", "手数料", "送料", "利益額", "利益率"]);
    }
    
    sheet.appendRow([
      params.date,
      params.shopName,
      params.itemName,
      params.price,
      params.cost,
      params.fee,
      params.shipping,
      params.profit,
      params.profitRate
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const headers = data[0];
  const rows = data.slice(1);
  
  const result = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      // プロパティ名をキャメルケースに変換（簡易版）
      const keyMap = {
        "日付": "date",
        "店舗名": "shopName",
        "商品名": "itemName",
        "販売価格": "price",
        "仕入れ原価": "cost",
        "手数料": "fee",
        "送料": "shipping",
        "利益額": "profit",
        "利益率": "profitRate"
      };
      obj[keyMap[header] || header] = row[i];
    });
    return obj;
  });
  
  // 最新のものを前にする
  result.reverse();
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 初回セットアップ用関数（GAS上で手動実行も可能）
function initSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["日付", "店舗名", "商品名", "販売価格", "仕入れ原価", "手数料", "送料", "利益額", "利益率"]);
    return "ヘッダーを作成しました。";
  }
  return "既にヘッダーが存在します。";
}
