export default function BuyerWalletSnapshot({wallet}){

  return(

    <div className="bg-white shadow rounded-xl p-6">

      <h2 className="font-semibold mb-4">
        Wallet
      </h2>

      <p className="text-2xl font-bold">
        ₹{wallet.balance || 0}
      </p>

      <button
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
      >
        Add Money
      </button>

    </div>

  )

}