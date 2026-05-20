export const isAdminLoggedIn = (req, res, next) => {
  const admin = req.session.admin;
 
  if (!admin) {
    return res.redirect("login");
  }

  next();
};
