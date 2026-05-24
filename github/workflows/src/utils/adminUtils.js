export const MY_ADMIN_EMAIL = "3liigamiing@gmail.com";

export const checkIsAdmin = (user) => {
  if (!user || !user.email) return false;
  return user.email.toLowerCase().trim() === MY_ADMIN_EMAIL.toLowerCase().trim();
};
