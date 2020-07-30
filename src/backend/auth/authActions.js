import backend from "../api/backend";
import flattenApi from "../api/api";

// states
export const AUTH_UNINITIALISED = "AUTH_UNINITIALISED";
export const AUTH_AUTHENTICATED = "AUTH_AUTHENTICATED";
export const AUTH_UNAUTHENTICATED = "AUTH_UNAUTHENTICATED";

// actions
export const SET_AUTHENTICATED = "SET_AUTHENTICATED";
export const SET_UNAUTHENTICATED = "SET_UNAUTHENTICATED";

export const UNAUTHENTICATED_CONTEXT = {
  failedRequest: "FAILED_REQUEST",
  badCookie: "BAD_COOKIE",
  expireSoon: "EXPIRE_SOON",
  userDecision: "USER_DECISION",
  pageLoad: "PAGE_LOAD",
};

export const fetchAuthState = (contextIfUnauthenticated) => async (
  dispatch
) => {
  try {
    const res = await backend.request(flattenApi.getAuth);
    // check if the response is empty, indicating failed auth
    // https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
    if (
      res.status !== 200 ||
      (Object.keys(res.data).length === 0 && res.data.constructor === Object)
    ) {
      dispatch(logout(false, contextIfUnauthenticated));
    } else {
      dispatch({ type: SET_AUTHENTICATED, payload: res.data });
    }
  } catch (e) {
    dispatch(logout(false, UNAUTHENTICATED_CONTEXT.failedRequest));
  }
};

export const logout = (sendApiRequest, context) => async (dispatch) => {
  if (sendApiRequest) {
    try {
      await backend.request(flattenApi.logout);
    } catch (e) {
      console.error(e);
    }
  }

  dispatch({ type: SET_UNAUTHENTICATED, payload: context });
};
