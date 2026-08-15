require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("cookie-session");
const db = require("./db");
const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(session({
  name: "bantha_trax",
  keys: [process.env.SESSION_SECRET || "dev-only-change-me"],
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 30
}));

const auth = (req,res,next) => {
  if (!req.session.userId) return res.status(401).json({error:"Sign in required"});
  next();
};

app.get("/health", (_,res)=>res.json({ok:true}));

app.post("/api/register", async (req,res) => {
  try {
    const email=(req.body.email||"").trim().toLowerCase();
    const password=req.body.password||"";
    if(!email || password.length<8) return res.status(400).json({error:"Email and password (8+ chars) required"});
    const hash=await bcrypt.hash(password,12);
    const r=await db.query("INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email",[email,hash]);
    req.session.userId=r.rows[0].id;
    res.json({user:r.rows[0]});
  } catch(e) {
    if(e.code==="23505") return res.status(409).json({error:"Email already registered"});
    console.error(e); res.status(500).json({error:"Server error"});
  }
});

app.post("/api/login", async (req,res) => {
  const email=(req.body.email||"").trim().toLowerCase();
  const r=await db.query("SELECT id,email,password_hash FROM users WHERE email=$1",[email]);
  if(!r.rows[0] || !(await bcrypt.compare(req.body.password||"",r.rows[0].password_hash)))
    return res.status(401).json({error:"Invalid login"});
  req.session.userId=r.rows[0].id;
  res.json({user:{id:r.rows[0].id,email:r.rows[0].email}});
});
app.post("/api/logout",(req,res)=>{req.session=null;res.json({ok:true});});

app.get("/api/figures",auth,async(req,res)=>{
  const r=await db.query(`
    SELECT f.*,
      COALESCE(SUM(p.quantity),0)::int purchased_qty,
      COALESCE(SUM(p.base_price+p.tax+p.shipping+p.other_cost),0)::numeric total_spent,
      CASE WHEN COALESCE(SUM(p.quantity),0)>0
        THEN SUM(p.base_price+p.tax+p.shipping+p.other_cost)/SUM(p.quantity) ELSE 0 END avg_landed_cost
    FROM figures f LEFT JOIN purchases p ON p.figure_id=f.id AND p.user_id=$1
    WHERE f.user_id=$1 GROUP BY f.id ORDER BY f.created_at DESC`,[req.session.userId]);
  res.json(r.rows);
});

app.post("/api/figures",auth,async(req,res)=>{
  const {name,description="",recommended_buy=null,recommended_retail=null}=req.body;
  if(!name) return res.status(400).json({error:"Figure name required"});
  const r=await db.query(`INSERT INTO figures(user_id,name,description,recommended_buy,recommended_retail)
    VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [req.session.userId,name,description,recommended_buy,recommended_retail]);
  res.json(r.rows[0]);
});

app.get("/api/figures/:id/purchases",auth,async(req,res)=>{
  const r=await db.query(`SELECT p.* FROM purchases p JOIN figures f ON f.id=p.figure_id
    WHERE p.id IS NOT NULL AND p.figure_id=$1 AND p.user_id=$2 AND f.user_id=$2 ORDER BY purchased_at DESC,id DESC`,
    [req.params.id,req.session.userId]);
  res.json(r.rows);
});

app.post("/api/figures/:id/purchases",auth,async(req,res)=>{
  const owns=await db.query("SELECT id FROM figures WHERE id=$1 AND user_id=$2",[req.params.id,req.session.userId]);
  if(!owns.rows[0]) return res.status(404).json({error:"Figure not found"});
  const {quantity=1,base_price=0,tax=0,shipping=0,other_cost=0,purchased_at=null,notes=""}=req.body;
  const r=await db.query(`INSERT INTO purchases(user_id,figure_id,quantity,base_price,tax,shipping,other_cost,purchased_at,notes)
    VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date,CURRENT_DATE),$9) RETURNING *`,
    [req.session.userId,req.params.id,quantity,base_price,tax,shipping,other_cost,purchased_at,notes]);
  res.json(r.rows[0]);
});

app.listen(process.env.PORT||3000,()=>console.log(`Bantha Trax running on port ${process.env.PORT||3000}`));
