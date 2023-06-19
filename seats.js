const express = require("express");
const app = express()
const dotenv = require("dotenv")
dotenv.config()
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const csvtojson = require("csvtojson");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());



const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const client = require("twilio")(accountSid, authToken);




//connect to mongodb database server
mongoose.connect("mongodb+srv://"+process.env.USER+":"+process.env.PASS+"@booking-system.t8z3poi.mongodb.net/booking-system", {useNewURLParser: true});

//creating schema for Seat model
const Seat = mongoose.model("Seat", {
    id: {
        type: Number,
        require: true
    },
    seat_id: {
        type: String,
        require: true
    },
    seat_class: {
        type: String,
        require: true
    },
    booked: {
        type: Boolean,
        default: false
    }
});


//Adding the Seats csv data to the database
app.post("/seats", (req, res) => {
    csvtojson()
        .fromFile("Seats.csv")
        .then(csvData => {
            for (var i=0; i<500; i++) {
                var newSeat = {
                    id: csvData[i].id,
                    seat_id: csvData[i].seat_id,
                    seat_class: csvData[i].seat_class
                }
                var seat = new Seat(newSeat);
                seat.save().then(() => {
                console.log("New Seat Created");
                }).catch((err) => {
                    if (err) {
                        throw err;
                    }
                });
            }
        });
    res.send("Working");
});



// Creating schema for seat pricing model
const SeatPricing = mongoose.model("SeatPricing", {
    id: {
        type: Number,
        require: true
    },
    seat_class: {
        type: String,
        require: true
    },
    min_price: {
        type: Number
    },
    normal_price: {
        type: Number
    },
    max_price: {
        type: Number
    }
    //id,seat_class,min_price,normal_price,max_price
});


//adding the SeatPricing csv to the database

app.post("/seatpricing", (req, res) => {
    csvtojson()
        .fromFile("SeatPricing.csv")
        .then(csvData => {
            for (var i=0; i<10; i++) {
                var newSeatPricing = {
                    id: csvData[i].id,
                    seat_class: csvData[i].seat_class,
                    min_price: csvData[i].min_price,
                    normal_price: csvData[i].normal_price,
                    max_price: csvData[i].max_price
                }
                var seatpricing = new SeatPricing(newSeatPricing);
                seatpricing.save().then(() => {
                console.log("Seat Pricing Created");
                }).catch((err) => {
                    if (err) {
                        throw err;
                    }
                });
            }
        });
        res.send("Working");
    });



//Return all the seats, ordered by the seat class and also return a boolean is_booked for every seat.

app.get("/seats", (req, res) => {
    Seat.find().sort({seat_class: 1}).then((seats) => {
        res.json(seats);
    });
});


//Get Seat Pricing based on class

app.get("/seats/id", (req, res) => {
    // Seat.find({booked: false}, "id seat_class").sort({id: 1})
    // .populate({path: "min_price"})
    //     .then((s) => {
    //         res.json(s);
    // });
    Seat.aggregate([{$group: {_id: "$seat_class", seat_id: {$push: "$seat_id"} }}]).sort({_id: 1}).then((s) => {
        res.send(s);
    });
});


//Schema for booking model
const Booking = mongoose.model("Booking", {
    seat_ids: {
        type: String,
        require: true
    },
    name: {
        type: String,
        require: true
    },
    phone: {
        type: Number,
        require: true
    }
});


//Booking and adding new data to the database
app.post("/booking", (req, res) => {
    const book = new Booking({
        seat_ids: req.body.seat_ids,
        name: req.body.name,
        phone: req.body.phone
    });
    var booking = new Booking(book);
    booking.save().then(()=>{
        console.log("booking created");
    });
    const newVal = book.seat_ids.split(",");
    

    for(var i=0; i<newVal.length; i++) {
        Seat.findOneAndUpdate({seat_id: i}, {booked: true}).then(()=> {
            console.log("The seat is updated to booked");
            client.messages
                .create({ body: "Your seat is booked.", from: "+14068000980", to: "+91"+ book.phone.toString() })
                .then(message => console.log(message.sid));
        }).catch((err) => {
            console.log("Seat not found");
            console.log(err);
        });
    }
});



app.get("/booking", (req, res) => {
    Booking.find().then((b) => {
        res.json(b);
    });
});



// Get all seat pricing

app.get("/seatpricing", (req, res) => {
    SeatPricing.find().then((s) => {
        res.json(s);
    });
});



//root get request
app.get("/", (req, res) => {
    res.send("This is a Booking system");
});

//give life to project
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully.");
});
