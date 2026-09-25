import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateWeeklyReport = (stats: any, user: any) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55); // gray-800
  doc.text('Weekly Study Progress Report', 14, 22);
  
  // User Info
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(`Student: ${user?.name || 'N/A'}`, 14, 32);
  doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 38);

  // Summary Metrics
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text('Activity Summary', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [['Metric', 'Value']],
    body: [
      ['Weekly Study Hours', stats?.weeklyStudyHours?.toString() || '0'],
      ['Monthly Study Hours', stats?.monthlyStudyHours?.toString() || '0'],
      ['Topics Completed', stats?.completedTopics?.toString() || '0'],
      ['Topics Pending', stats?.pendingTopics?.toString() || '0'],
      ['AI Readiness Score', `${stats?.readinessScore || 0}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 11 },
  });

  // Upcoming Schedule / Revisions
  const nextY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Upcoming Revisions', 14, nextY);

  const revisionsBody = stats?.upcomingRevisions?.length > 0
    ? stats.upcomingRevisions.map((session: any) => [
        session.subject?.name || 'N/A',
        new Date(session.startTime).toLocaleDateString(),
        new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ])
    : [['No upcoming revisions scheduled.', '', '']];

  autoTable(doc, {
    startY: nextY + 5,
    head: [['Subject', 'Date', 'Time']],
    body: revisionsBody,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22] },
    styles: { fontSize: 10 },
  });

  // Save the PDF
  doc.save(`Study_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
