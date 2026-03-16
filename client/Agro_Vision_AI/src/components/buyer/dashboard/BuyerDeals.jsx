export default function BuyerDeals({deals}){

  return(

    <div className="bg-white shadow rounded-xl p-6">

      <h2 className="text-lg font-semibold mb-4">
        Marketplace Opportunities
      </h2>

      <div className="space-y-4">

        {deals.map((deal)=>(
          <div
            key={deal._id}
            className="flex justify-between items-center border-b pb-3"
          >

            <div>

              <p className="font-medium">
                {deal.cropName}
              </p>

              <p className="text-sm text-gray-500">
                Farmer: {deal.farmer?.name}
              </p>

            </div>

            <div className="text-right">

              <p className="font-bold">
                ₹{deal.price}
              </p>

              <button
                className="text-green-600 text-sm"
              >
                View
              </button>

            </div>

          </div>
        ))}

      </div>

    </div>

  )

}