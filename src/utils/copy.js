/**
 * 遞迴複製目錄
 *
 * 使用 Node 18+ 內建的 fs/promises cp 函式,支援遞迴複製。
 * 不引入外部依賴(例如 fs-extra),保持套件輕量。
 */

import { cp } from 'node:fs/promises';

/**
 * 遞迴複製整個目錄(包含隱藏檔案如 .gitkeep)
 *
 * @param {string} source - 來源目錄絕對路徑
 * @param {string} dest - 目的目錄絕對路徑
 */
export async function copyDirRecursive(source, dest) {
  await cp(source, dest, {
    recursive: true,
    // errorOnExist 不啟用 → 若目的已存在則覆蓋(但我們在 init 已先檢查過,不會走到這)
    // preserveTimestamps 不啟用 → 預設 false 即可,複製後 mtime 是當下時間
  });
}
