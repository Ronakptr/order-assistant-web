import {
  formatActivityDate,
  getActivityTypeLabel,
} from "../../utils/activityLog";
import "./ActivityLogModal.css";

export default function ActivityLogModal({
  open,
  title = "گزارش فعالیت‌ها",
  logs = [],
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="activity-modal-backdrop" onMouseDown={onClose}>
      <div
        className="activity-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="activity-modal__header">
          <h3>{title}</h3>

          <button
            type="button"
            className="activity-modal__close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        <div className="activity-modal__summary">
          <span>تعداد فعالیت‌ها:</span>
          <strong>{logs.length}</strong>
        </div>

        <div className="activity-modal__body">
          {logs.length === 0 ? (
            <div className="activity-empty">
              هنوز فعالیتی برای نمایش ثبت نشده است.
            </div>
          ) : (
            <div className="activity-list">
              {logs.map((log) => (
                <div className="activity-item" key={log.id}>
                  <div className="activity-item__top">
                    <span className="activity-type">
                      {getActivityTypeLabel(log.type)}
                    </span>

                    <span className="activity-date">
                      {formatActivityDate(log.createdAt)}
                    </span>
                  </div>

                  <div className="activity-title">
                    {log.title || getActivityTypeLabel(log.type)}
                  </div>

                  {log.description && (
                    <div className="activity-description">
                      {log.description}
                    </div>
                  )}

                  <div className="activity-meta">
                    <span>
                      انجام‌دهنده:{" "}
                      <strong>{log.actorUsername || "-"}</strong>
                    </span>

                    {log.targetUsername && (
                      <span>
                        کاربر هدف:{" "}
                        <strong>{log.targetUsername}</strong>
                      </span>
                    )}

                    {log.entityId && (
                      <span>
                        کد/شناسه: <strong>{log.entityId}</strong>
                      </span>
                    )}

                    {log.amount && (
                      <span>
                        مبلغ: <strong>{log.amount}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="activity-modal__footer">
          <button
            type="button"
            className="activity-modal__button"
            onClick={onClose}
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}