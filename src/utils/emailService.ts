import emailjs from '@emailjs/browser';

export const sendPersonnelInviteEmail = async (
  recipientEmail: string,
  recipientName: string,
  projectName: string,
  roles: string[] = ['Member']
) => {
  // We'll read from Vite's env variables
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn('EmailJS is not configured in .env.local. Email will not be sent.');
    return;
  }

  try {
    // These keys must match the variables used in your EmailJS template!
    const templateParams = {
      to_email: recipientEmail,
      to_name: recipientName,
      project_name: projectName,
      roles_assigned: roles.join(', '),
    };

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      { publicKey }
    );

    console.log('Email sent successfully!', response.status, response.text);
    return response;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

export const sendTaskAssignmentEmail = async (
  recipientEmail: string,
  recipientName: string,
  projectName: string,
  taskName: string,
  allTasks: string
) => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TASK_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn('EmailJS Task Template is not configured in .env.local.');
    return;
  }

  try {
    const templateParams = {
      to_email: recipientEmail,
      to_name: recipientName,
      project_name: projectName,
      task_name: taskName,
      all_tasks: allTasks,
    };

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      { publicKey }
    );
    
    console.log('Task assignment email sent successfully!', response.status, response.text);
    return response;
  } catch (error) {
    console.error('Failed to send task assignment email:', error);
    throw error;
  }
};
