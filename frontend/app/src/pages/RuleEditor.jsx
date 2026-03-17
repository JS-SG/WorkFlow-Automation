import {useState} from "react";
import api from "../api/api";

export default function RuleEditor(){

 const[condition,setCondition]=useState("");

 const createRule=()=>{

  api.post("/rules",{
   step_id:"STEP_ID",
   condition:condition,
   next_step_id:null,
   priority:1
  });

 };

 return(

 <div>

 <h2>Create Rule</h2>

 <input
 placeholder="condition"
 onChange={(e)=>setCondition(e.target.value)}
 />

 <button onClick={createRule}>
 Add Rule
 </button>

 </div>

 );

}