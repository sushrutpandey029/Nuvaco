export const isAdminLoggedIn = (req, res, next) => {
  console.log("req.sesson",req.session)
  const admin = req.session.admin;
 console.log("admin in middleware",admin)
  if (!admin) {
    return res.redirect("login");
  }

  next();
};
