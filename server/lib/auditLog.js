export async function writeAuditLog(admin, { actorUserId, action, entityType, entityId, metadata = {} }) {
  try {
    await admin.from('audit_logs').insert({
      actor_user_id: actorUserId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata,
    })
  } catch (err) {
    console.warn('[audit_log]', err.message)
  }
}
