import User from "../../models/user.model.js";
import { generateTokens, setCookies, deleteTokens } from "../../utils/jwt.js";

const signup = async (req, res, next) => {
  const { name, email, password, phone, address } = req.body;
  if (!name || !email || !password || !phone)
    return res.status(400).json({
      status: "faild",
      message: "Missing required fields",
    });

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const PHONE_REGEX = /^[0-9]{11}$/; // Consider making country-code aware

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid email format",
    });
  }

  if (!PHONE_REGEX.test(phone)) {
    return res.status(400).json({
      status: "failed",
      message: "Phone number must be 11 digits",
    });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

    if (existingUser) {
      const conflictField = existingUser.email === email ? "email" : "phone";
      return res.status(409).json({
        status: "failed",
        message: `This ${conflictField} is already in use`,
      });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      phone,
      address: address ? [address] : [],
    });

    console.log(newUser);
    

    const sanitizedUser = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      address: newUser.address,
      cart: newUser.cart,
      wishlist: newUser.wishlist,
      orders: newUser.orders,
      role: newUser.role,
    };

    const { refresh_token, access_token } = await generateTokens(
      newUser._id,
      newUser.role
    );

    setCookies(res, access_token, refresh_token);

    return res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: sanitizedUser,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      status: "error",
      message: "Both identifier and password are required",
    });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        status: "error",
        message: "Admins must use admin login",
      });
    }

    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      cart: user.cart,
      wishlist: user.wishlist,
      orders: user.orders,
      role: user.role,
    };

    const { refresh_token, access_token } = await generateTokens(
      user._id,
      user.role
    );

    setCookies(res, access_token, refresh_token);

    return res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      data: sanitizedUser,
    });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user?.userId) {
      await deleteTokens(req.user.userId);
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    };

    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const checkAuth = (req, res) => {
  return res.status(200).json({ status: "success", message: "Authenticated" });
};

const sendOTP = (req, res) => {
  res.json("send otp");
};

const getOTP = (req, res) => {
  res.json("get otp");
};

export { signup, login, logout, sendOTP, getOTP, checkAuth };
