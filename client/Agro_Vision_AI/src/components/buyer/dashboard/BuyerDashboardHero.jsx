import { motion } from "framer-motion";

export default function BuyerDashboardHero(){

  return(

    <motion.div
      initial={{opacity:0,y:20}}
      animate={{opacity:1,y:0}}
      className="bg-green-600 text-white p-6 rounded-xl shadow"
    >

      <h1 className="text-2xl font-bold">
        Welcome Back Buyer 👋
      </h1>

      <p className="text-sm mt-1">
        AgroVision AI marketplace insights for smarter crop purchasing.
      </p>

    </motion.div>

  )

}