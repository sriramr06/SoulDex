export const saveAuthToken = (token, remember = true) => {
  try {
    if (remember) {
      sessionStorage.removeItem('authToken');
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
      sessionStorage.setItem('authToken', token);
    }
  } catch {
    console.debug('saveAuthToken failed');
  }
};

export const saveRefreshToken = (token, remember = true) => {
  try {
    if (remember) {
      sessionStorage.removeItem('refreshToken');
      localStorage.setItem('refreshToken', token);
    } else {
      localStorage.removeItem('refreshToken');
      sessionStorage.setItem('refreshToken', token);
    }
  } catch {
    console.debug('saveRefreshToken failed');
  }
};

export const getAuthToken = () => {
  try {
    return (
      sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
    );
  } catch {
    return null;
  }
};

export const getRefreshToken = () => {
  try {
    return (
      sessionStorage.getItem('refreshToken') ||
      localStorage.getItem('refreshToken')
    );
  } catch {
    return null;
  }
};

export const clearAuthToken = () => {
  try {
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
  } catch {
    console.debug('clearAuthToken failed');
  }
};

export const clearRefreshToken = () => {
  try {
    sessionStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshToken');
  } catch {
    console.debug('clearRefreshToken failed');
  }
};
