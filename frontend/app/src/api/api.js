import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
});

api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem("workflow_user");
  if (storedUser) {
    const user = JSON.parse(storedUser);
    config.headers["X-User-Id"] = user.id;
    config.headers["X-User-Role"] = user.role;
    config.headers["X-User-Email"] = user.email;
    if (user.department_id) {
      config.headers["X-User-Department"] = user.department_id;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ─── Workflows ────────────────────────────────────────────────
export const getWorkflows = (params) => api.get("/workflows", { params });
export const getUserWorkflows = (userId, params) => api.get(`/workflows/user/${userId}`, { params });
export const getWorkflow = (id) => api.get(`/workflows/${id}`);
export const createWorkflow = (data) => api.post("/workflows", data);
export const updateWorkflow = (id, data) => api.put(`/workflows/${id}`, data);
export const deleteWorkflow = (id) => api.delete(`/workflows/${id}`);
export const setStartStep = (id, start_step_id) => api.patch(`/workflows/${id}/start-step`, { start_step_id });

// ─── Steps ───────────────────────────────────────────────────
export const getSteps = (workflowId) => api.get(`/workflows/${workflowId}/steps`);
export const createStep = (workflowId, data) => api.post(`/workflows/${workflowId}/steps`, { ...data, workflow_id: workflowId });
export const updateStep = (id, data) => api.put(`/steps/${id}`, data);
export const deleteStep = (id) => api.delete(`/steps/${id}`);

// ─── Rules ───────────────────────────────────────────────────
export const getRules = (stepId) => api.get(`/steps/${stepId}/rules`);
export const createRule = (stepId, data) => api.post(`/steps/${stepId}/rules`, { ...data, step_id: stepId });
export const updateRule = (id, data) => api.put(`/rules/${id}`, data);
export const deleteRule = (id) => api.delete(`/rules/${id}`);

// ─── Executions ───────────────────────────────────────────────
export const getExecutions = () => api.get("/executions");
export const getUserExecutions = (userId) => api.get(`/executions/user/${userId}`);
export const getExecution = (id) => api.get(`/executions/${id}`);
export const getExecutionDetails = (id) => api.get(`/executions/details/${id}`);
export const startExecution = (workflowId, data) => api.post(`/executions/${workflowId}/execute`, data);
export const cancelExecution = (id) => api.post(`/executions/${id}/cancel`);
export const retryExecution = (id) => api.post(`/executions/${id}/retry`);
export const approveExecution = (id, data) => api.post(`/executions/${id}/approve`, data);

// ─── Notifications ────────────────────────────────────────────
export const getNotifications = (params) => api.get("/notifications", { params });
export const getUserNotifications = (userId, params) => api.get(`/notifications/user/${userId}`, { params });
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch("/notifications/all/read");

export default api;