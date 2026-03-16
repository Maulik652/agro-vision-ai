export default function BuyerNotifications({notifications}){

  return(

    <div className="bg-white shadow rounded-xl p-6">

      <h2 className="font-semibold mb-4">
        Notifications
      </h2>

      <div className="space-y-3">

        {notifications.map(n=>(
          <p
            key={n._id}
            className="text-sm"
          >
            {n.message}
          </p>
        ))}

      </div>

    </div>

  )

}