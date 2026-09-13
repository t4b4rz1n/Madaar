import re

# Update NotificationHistoryList.tsx
with open('apps/web/src/features/notifications/components/NotificationHistoryList.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'import { Calendar, Eye, EyeSlash } from "iconsax-reactjs";',
    'import { Calendar, Eye, EyeSlash } from "iconsax-reactjs";\nimport { useNavigate } from "react-router-dom";'
)

# Insert navigate hook
content = content.replace(
    'const { mutate: markSeen } = useMarkNotificationSeen();',
    'const { mutate: markSeen } = useMarkNotificationSeen();\n  const navigate = useNavigate();'
)

# Update handleCardClick
old_handler = '''  const handleCardClick = (notification: NotificationType) => {
    if (!notification.seen) {
      markSeen(notification.id);
    }
  };'''

new_handler = '''  const handleCardClick = (notification: NotificationType) => {
    if (!notification.seen) {
      markSeen(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };'''

content = content.replace(old_handler, new_handler)

with open('apps/web/src/features/notifications/components/NotificationHistoryList.tsx', 'w') as f:
    f.write(content)

# Update NotificationCenter.tsx
with open('apps/web/src/features/layout/NotificationCenter.tsx', 'r') as f:
    content = f.read()

# Replace NotificationRow usage
content = content.replace(
    '<NotificationRow key={notification.id} notification={notification} />',
    '<NotificationRow key={notification.id} notification={notification} onClick={() => setIsOpen(false)} />'
)

# Replace NotificationRow definition
old_row = '''const NotificationRow = ({ notification }: { notification: Notification }) => {
  const content = (
    <>
      <span
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.seen ? "bg-success" : "bg-primary"
          }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-6 text-base-content/80">{notification.text}</span>
        <span className="mt-1 block text-[0.68rem] text-base-content/45">
          {formatNotificationDate(notification.created_at)}
        </span>
      </span>
    </>
  );

  return (
    <div className="flex gap-3 rounded-xl px-3 py-3">
      {content}
    </div>
  );
};'''

new_row = '''const NotificationRow = ({ notification, onClick }: { notification: Notification, onClick: () => void }) => {
  const content = (
    <>
      <span
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.seen ? "bg-success" : "bg-primary"
          }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-6 text-base-content/80">{notification.text}</span>
        <span className="mt-1 block text-[0.68rem] text-base-content/45">
          {formatNotificationDate(notification.created_at)}
        </span>
      </span>
    </>
  );

  if (notification.link) {
    return (
      <Link to={notification.link} onClick={onClick} className="motion-interactive flex gap-3 rounded-xl px-3 py-3 hover:bg-base-200">
        {content}
      </Link>
    );
  }

  return (
    <div className="flex gap-3 rounded-xl px-3 py-3">
      {content}
    </div>
  );
};'''

content = content.replace(old_row, new_row)

with open('apps/web/src/features/layout/NotificationCenter.tsx', 'w') as f:
    f.write(content)

