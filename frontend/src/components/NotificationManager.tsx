import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { isAfter, subMinutes, isBefore } from 'date-fns';

const NotificationManager = () => {
  const { user } = useAuth();
  const notifiedSessions = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const checkNotifications = async () => {
      try {
        const schedulesRes = await api.get('/schedules');

        const now = new Date();

        // Check for upcoming sessions (10 mins before)
        schedulesRes.data.forEach((schedule: any) => {
          schedule.sessions.forEach((session: any) => {
            if (session.type === 'STUDY' || session.type === 'REVISION') {
              const startTime = new Date(session.startTime);
              const notifyTime = subMinutes(startTime, 10);
              
              // If it's between 10 mins before and the start time
              if (isAfter(now, notifyTime) && isBefore(now, startTime)) {
                if (!notifiedSessions.current.has(session.id)) {
                  toast.success(
                    `Upcoming ${session.type.toLowerCase()} session for ${session.subject?.name || 'a subject'} in less than 10 mins!`,
                    { duration: 8000, icon: '⏰' }
                  );
                  notifiedSessions.current.add(session.id);
                }
              }
            }
          });
        });

      } catch (error) {
        console.error('Failed to check notifications', error);
      }
    };

    // Check immediately and then every minute
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, [user]);

  return null;
};

export default NotificationManager;
