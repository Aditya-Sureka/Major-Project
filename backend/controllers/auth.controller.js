import admin from "firebase-admin";
import cookie from "cookie"
import axios from "axios";
import dotenv from "dotenv"
import path from "path";
import User from "../models/user.model.js"
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
import Insurer from "../models/insurer.model.js";

class AuthController {

    constructor(FIREBASE_API_KEY, JWT_SECRET) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // Try to use environment variable first, fallback to JSON file
        let serviceAccount;
        try {
            if (process.env.FIREBASE_ADMIN_SDK) {
                serviceAccount = JSON.parse(
                    Buffer.from(process.env.FIREBASE_ADMIN_SDK, 'base64').toString('utf8')
                );
            } else {
                // Fallback to reading the JSON file directly
                const serviceAccountPath = path.join(__dirname, '..', 'insuredsaathi-29f2f-firebase-adminsdk-fbsvc-e3cb6cb152.json');
                serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading Firebase admin SDK:', error.message);
            throw new Error('Failed to load Firebase admin SDK configuration');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

    }

    async PolicyHolderSignUp(req, res) {
        const { email, password, name, phone } = req.body;
        console.log(req.body);

        try {
            const userRecord = await admin.auth().createUser({
                email, password
            });

            console.log(userRecord);

            const firebaseUid = userRecord.uid;

            await admin.auth().setCustomUserClaims(firebaseUid, { role: 'policyHolder' });

            const newUserRecord = await User.create({ firebaseUid, name, email, phone });

            const token = jwt.sign({ firebaseUid }, process.env.JWT_SECRET, {
                expiresIn: '5d'
            });


            res.status(201).json({
                message: "Created User Successfully",
                newUserRecord,
                token
            });

        } catch (err) {
            res.status(400).json({ message: err?.message });
        }
    }

    async InsurerSignUp(req, res) {
        const { orgName, email, password } = req.body;
        let firebaseUid = null;

        try {
            // Validate required fields
            if (!orgName || !email || !password) {
                return res.status(400).json({ 
                    message: "Missing required fields",
                    error: "orgName, email, and password are required" 
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ 
                    message: "Invalid email format",
                    error: "Please provide a valid email address" 
                });
            }

            // Validate password strength
            if (password.length < 6) {
                return res.status(400).json({ 
                    message: "Weak password",
                    error: "Password must be at least 6 characters long" 
                });
            }

            // Check if email already exists
            const existingInsurer = await Insurer.findOne({ email });
            if (existingInsurer) {
                return res.status(400).json({ 
                    message: "Email already registered",
                    error: "This email is already associated with an insurer account" 
                });
            }

            console.log("Creating Firebase user for email:", email);
            const insurerRecord = await admin.auth().createUser({
                email, password
            });

            console.log("Firebase user created with uid:", insurerRecord.uid);
            firebaseUid = insurerRecord.uid;

            await admin.auth().setCustomUserClaims(firebaseUid, { role: 'insurer' })

            console.log("Creating Insurer record in database");
            await Insurer.create({
                firebaseUid: firebaseUid,
                orgName: orgName,
                email: email
            })

            const token = jwt.sign({ firebaseUid }, process.env.JWT_SECRET, {
                expiresIn: '5d'
            });

            console.log("Insurer signup successful for:", email);
            res.status(201).json({
                message: "Insurer created Succesfully",
                token
            });

        } catch (err) {
            console.error("InsurerSignUp Error:", err);
            console.error("Error message:", err?.message);
            console.error("Error code:", err?.code);

            // Roll back Firebase user if DB write failed after Firebase creation.
            if (firebaseUid && err?.code !== 'auth/email-already-exists') {
                try {
                    await admin.auth().deleteUser(firebaseUid);
                    console.log("Rolled back Firebase user:", firebaseUid);
                } catch (rollbackErr) {
                    console.error("Failed to roll back Firebase user:", rollbackErr?.message);
                }
            }
            
            // Handle specific Firebase errors
            if (err.code === 'auth/email-already-exists') {
                return res.status(400).json({ 
                    message: "Email already in use",
                    error: "This email is already registered with another account" 
                });
            }
            if (err.code === 'auth/invalid-email') {
                return res.status(400).json({ 
                    message: "Invalid email",
                    error: "The email address is not valid" 
                });
            }
            if (err.code === 'auth/weak-password') {
                return res.status(400).json({ 
                    message: "Weak password",
                    error: "Password should be at least 6 characters" 
                });
            }

            res.status(400).json({ 
                message: "Signup failed",
                error: err?.message || "An error occurred during signup" 
            });
        }
    }

    async login(req, res) {
        const { email, password } = req.body;

        try {

            const response = await axios.post(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
                {
                    email,
                    password,
                    returnSecureToken: true,
                }
            );

            const { idToken, localId: firebaseUid } = response.data;

            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const role = decodedToken.role;


            if (!role) {
                return res.status(404).json({ message: "No Role Defined, Contact Admin" });
            }

            let user;
            if (role === 'policyHolder') {
                user = await User.findOne({ firebaseUid });
            } else if (role === 'insurer') {
                user = await Insurer.findOne({ firebaseUid });
            } else {
                return res.status(400).json({ message: "Unknown Role" });
            }

            if (!user) {
                return res.status(404).json({ message: "No Such User in DB" });
            }

            const token = jwt.sign({ firebaseUid }, process.env.JWT_SECRET, {
                expiresIn: "5d",
            });

            let responseUser;

            if (role === 'policyHolder') {
                responseUser = {
                    policyHolder: {
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        role: role
                    }
                };
            } else {
                responseUser = {
                    insurer: {
                        orgName: user.orgName,
                        email: user.email,
                        role: role
                    }
                };
            }

            res.status(200).json({
                message: "Login Successful",
                token,
                ...responseUser
            });

        } catch (err) {
            console.log(err?.message);
            res.status(400).json({ message: err?.message });
        }
    }

    async logout(req, res) {
        res.setHeader("Set-Cookie", cookie.serialize("session", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 0,
            sameSite: "strict",
            path: "/",
        }));
        res.status(200).json({ message: "Logged out successfully" });
    }

}

const authController = new AuthController(process.env.FIREBASE_API_KEY, process.env.JWT_SECRET);
export default authController;