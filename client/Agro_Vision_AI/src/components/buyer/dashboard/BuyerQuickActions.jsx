import { useNavigate } from "react-router-dom";

export default function BuyerQuickActions(){

  const nav = useNavigate()

  return(

    <div className="bg-white shadow rounded-xl p-6">

      <h2 className="font-semibold mb-4">
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 gap-4">

        <button
          onClick={()=>nav("/buyer/marketplace")}
          className="bg-green-600 text-white p-3 rounded"
        >
          Browse Marketplace
        </button>

        <button
          onClick={()=>nav("/buyer/orders")}
          className="bg-gray-800 text-white p-3 rounded"
        >
          View Orders
        </button>

      </div>

    </div>

  )

}