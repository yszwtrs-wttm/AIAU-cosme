/** 商品ページの口コミ取得。除外分はサーバー側で落とし、10件ずつ読む。 */
export const REVIEWS_PAGE_SIZE = 10;

export const REVIEW_SELECT =
  "*,profiles(handle,display_name,avatar_hue,avatar_url,skin_type,skin_tone_hex),review_images(id,review_id,path,pos)";
