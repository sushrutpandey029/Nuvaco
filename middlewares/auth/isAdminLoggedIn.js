// export const isAdminLoggedIn = (req, res, next) => {
//   console.log("req.sesson",req.session)
//   const admin = req.session.admin;
//  console.log("admin in middleware",admin)
//   if (!admin) {
//     return res.redirect("login");
//   }

//   next();
// };
export const isAdminLoggedIn = (req, res, next) => {
  const admin = req.session.admin;

  if (!admin) {
    const isAjax =
      req.xhr ||
      req.headers["content-type"]?.includes("application/json") ||
      req.headers.accept?.includes("application/json");

    if (isAjax) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    return res.redirect("login");
  }

  next();
};