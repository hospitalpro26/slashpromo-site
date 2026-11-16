// Private dashboard archive markers. Original questions, enquiries and reply history remain intact.
export async function ensureAdminArchiveDb(env){
  await env.QA_DB.prepare("CREATE TABLE IF NOT EXISTS admin_archived_records (kind TEXT NOT NULL CHECK(kind IN ('question','enquiry')), record_id TEXT NOT NULL, archived_at TEXT NOT NULL, PRIMARY KEY(kind,record_id))").run();
}
export async function changeAdminArchive(env,kind,id,archive){
  if(archive){
    await env.QA_DB.prepare("INSERT OR IGNORE INTO admin_archived_records(kind,record_id,archived_at) VALUES(?,?,?)")
      .bind(kind,id,new Date().toISOString()).run();
  }else{
    await env.QA_DB.prepare("DELETE FROM admin_archived_records WHERE kind=? AND record_id=?").bind(kind,id).run();
  }
}
