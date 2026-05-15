import { useEffect, useReducer, useRef } from "react";

const initialState = {
  data: null,
  loading: true,
  error: null,
};

function asyncDataReducer(state, action) {
  switch (action.type) {
    case "start":
      return { ...state, loading: true, error: null };
    case "success":
      return { data: action.payload, loading: false, error: null };
    case "error":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function useAsyncData(loader, requestKey = "default", options = {}) {
  const loaderRef = useRef(loader);
  const [state, dispatch] = useReducer(asyncDataReducer, {
    ...initialState,
    loading: options.initialLoading ?? true,
    data: options.initialData ?? null,
  });

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let ignore = false;

    async function run() {
      dispatch({ type: "start" });
      try {
        const payload = await loaderRef.current();
        if (!ignore) {
          dispatch({ type: "success", payload });
        }
      } catch (error) {
        if (!ignore) {
          dispatch({ type: "error", payload: error });
        }
      }
    }

    run();

    return () => {
      ignore = true;
    };
  }, [requestKey]);

  async function reload() {
    dispatch({ type: "start" });
    try {
      const payload = await loaderRef.current();
      dispatch({ type: "success", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
  }

  return { ...state, reload };
}
