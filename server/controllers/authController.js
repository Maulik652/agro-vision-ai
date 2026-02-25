import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";



/* REGISTER */
export const registerUser = async (req, res) => {

  try {

    const {
      name,
      email,
      phone,
      password,
      role,
      state,
      city,
      farmSize,
      crops,
      company,
      license,
      qualification,
      experience
    } = req.body;


    if (!name || !email || !phone || !password || !state || !city) {

      return res.status(400).json({
        message: "Please fill all required fields"
      });

    }


    const userExists = await User.findOne({ email });

    if (userExists) {

      return res.status(400).json({
        message: "User already exists"
      });

    }


    const normalizedRole = (role || "farmer").toLowerCase();
    const allowedRoles = ["farmer", "buyer", "expert", "admin"];

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await User.create({

      name,
      email,
      phone,
      password: hashedPassword,

      role: normalizedRole,

      state,
      city,

      farmSize,
      crops,

      company,
      license,

      qualification,
      experience

    });


    res.status(201).json({

      token: generateToken(user._id, user.role),

      user: {

        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        state: user.state,
        city: user.city

      }

    });


  }
  catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};




/* LOGIN */
export const loginUser = async (req, res) => {

  try {

    const { email, password } = req.body;


    if (!email || !password) {

      return res.status(400).json({
        message: "Enter email & password"
      });

    }


    const user = await User.findOne({ email });

    if (!user) {

      return res.status(400).json({
        message: "Invalid credentials"
      });

    }


    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {

      return res.status(400).json({
        message: "Invalid credentials"
      });

    }


    res.json({

      token: generateToken(user._id, user.role),

      user: {

        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        state: user.state,
        city: user.city

      }

    });

  }
  catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};