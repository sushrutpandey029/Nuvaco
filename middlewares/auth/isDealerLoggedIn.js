export const isDealerLoggedIn = (req, res, next) => {
  const dealer = req.session.dealer;

  if (!dealer) {
    return res.redirect("/login");
  }

  next();
};
