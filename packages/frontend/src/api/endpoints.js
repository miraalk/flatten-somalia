import axios from "axios";
import backend from "./backend";

const axiosClient = axios.create({ baseURL: backend, withCredentials: true });

const request = (method, url, options) =>
  axiosClient.request({ method, url, ...options });

const getAuth = () => request("GET", "/auth");

const login = (email) => request("POST", "/auth/login", { data: { email } });

const logout = () => request("DELETE", "/auth/logout");

const submitSurvey = (data, key) => {
  // TODO remove initialHousehold special case by removing endpoint on backend
  const url = key === "initialHousehold" ? "/submit/initial" : "/survey/" + key;
  return request("POST", url, { data });
};

const addVolunteer = (volunteerData) =>
  request("POST", "/volunteer", { data: { volunteerData } });

const listVolunteers = () => request("GET", "/volunteer/list");

const changeVolunteerAccess = (access, volunteerId) =>
  request("POST", "/volunteer/changeAccess", { data: { access, volunteerId } });

export default {
  getAuth,
  login,
  logout,
  submitSurvey,
  addVolunteer,
  listVolunteers,
  changeVolunteerAccess,
};
