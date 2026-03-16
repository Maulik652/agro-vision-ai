export default function BuyerSummaryCards({summary}){

  const cards = [

    {
      title:"Wallet Balance",
      value:`₹${summary.walletBalance || 0}`
    },
    {
      title:"Active Orders",
      value:summary.activeOrders || 0
    },
    {
      title:"Delivered Orders",
      value:summary.deliveredOrders || 0
    }

  ]

  return(

    <div className="grid md:grid-cols-3 gap-6">

      {cards.map((card,i)=>(
        <div
          key={i}
          className="bg-white shadow rounded-lg p-6"
        >

          <p className="text-gray-500 text-sm">
            {card.title}
          </p>

          <h2 className="text-2xl font-bold mt-2">
            {card.value}
          </h2>

        </div>
      ))}

    </div>

  )

}