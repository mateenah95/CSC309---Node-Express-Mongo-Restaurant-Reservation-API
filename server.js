/* E4 server.js */
'use strict';
const log = console.log;

// Express
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

// Mongo and Mongoose
const { ObjectID } = require('mongodb')
const { mongoose } = require('./db/mongoose');
const { Restaurant } = require('./models/restaurant')


/// Route for adding restaurant, with *no* reservations (an empty array).
/* 
Request body expects:
{
	"name": <restaurant name>
	"description": <restaurant description>
}
Returned JSON should be the database document added.
*/
// POST /restaurants
app.post('/restaurants', (req, res) => {
	// Add code here
	const newRestaurant = new Restaurant(req.body);

	newRestaurant.save()
		.then(saved => {
			res.send(saved);
		})
		.catch(err => {
			res.send({ error: 'Could not add new restaurant.' });
		});
});


/// Route for getting all restaurant information.
// GET /restaurants
app.get('/restaurants', (req, res) => {
	// Add code here
	function findCallback(error, restaurants) {
		if (error) {
			res.status(500).send({ error: 'Could not fetch restaurants.' });
		}
		else {
			if (restaurants) {
				res.send(restaurants);
			}
			else {
				res.send([]);
			}
		}
	}

	Restaurant.find(findCallback);
});


/// Route for getting information for one restaurant.
// GET /restaurants/id
app.get('/restaurants/:id', (req, res) => {
	// Add code here
	const restId = req.params.id;

	function findCallback(error, result) {
		if (error) {
			log(error)
			res.status(500).send({ error: 'Server error. Could not fetch restaurant.' });
		}
		else {
			if (result) {
				res.send(result);
			}
			else {
				res.send(404).send({ error: 'Restaurant not found.' });
			}
		}
	}

	Restaurant.findOne({ '_id': restId }, findCallback);

});


/// Route for adding reservation to a particular restaurant.
/* 
Request body expects:
{
	"time": <time>
	"people": <number of people>
}
*/
// Returned JSON should have the restaurant database 
//   document that the reservation was added to, AND the reservation subdocument:
//   { "reservation": <reservation subdocument>, "restaurant": <entire restaurant document>}
// POST /restaurants/id
app.post('/restaurants/:id', (req, res) => {

	// Add code here
	const restId = req.params.id;
	const resvData = req.body;

	Restaurant.findOne({ '_id': restId }, (error, result) => {
		if (error) {
			res.status(500).send({ error: 'Server error. Reservation not added.' })
		}
		else {
			if (result) {
				result.reservations.push(resvData);

				result.updateOne({ $set: { 'reservations': result.reservations } }, (err, finalResult) => {
					if (err) {
						res.status(500).send({ error: 'Could not update reservations. Reservation not added.' })
					}
					else {
						if (finalResult) {
							res.send({ restaurant: result, reservation: result.reservations[result.reservations.length - 1] })
						}
						else {
							res.status(500).send({ message: "Could not update reservations. Reservation not added." })
						}
					}
				});
			}
			else {
				res.status(404).send({ error: 'Restaurant not found. Reservation not added.' })
			}
		}
	});
});


/// Route for getting information for one reservation of a restaurant (subdocument)
// GET /restaurants/id
app.get('/restaurants/:id/:resv_id', (req, res) => {
	// Add code here
	const restId = req.params.id;
	const resvId = req.params.resv_id;

	function findCallback(error, result) {
		if (error) {
			res.status(500).send({ error: 'Server error. Could not fetch restaurant.' })
		}
		else {
			if (result) {
				const reservations = result.reservations;
				const filteredResv = reservations.filter((el) => el._id == resvId)
				if (filteredResv.length === 0) {
					res.status(404).send({ error: 'Reservation not found.' })
				}
				else {
					res.send(filteredResv[0]);
				}
			}
			else {
				res.status(404).send({ error: "Restaurant not found." });
			}
		}
	}

	Restaurant.findOne({ '_id': restId }, findCallback);
});


/// Route for deleting reservation
// Returned JSON should have the restaurant database
//   document from which the reservation was deleted, AND the reservation subdocument deleted:
//   { "reservation": <reservation subdocument>, "restaurant": <entire restaurant document>}
// DELETE restaurant/<restaurant_id>/<reservation_id>
app.delete('/restaurants/:id/:resv_id', (req, res) => {
	// Add code here
	const restId = req.params.id;
	const resvId = req.params.resv_id;

	Restaurant.findOne({ '_id': restId }, (error, result) => {
		if (error) {
			res.status(500).send({ error: 'Server error. Could not delete reservation.' })
		}
		else {
			if (result) {
				const oldResvList = result.reservations;
				const tempList = oldResvList.filter(el => el._id == resvId);
				const temp = tempList[0];
				const newResvList = oldResvList.filter(el => el._id != resvId);

				result.reservations = newResvList;

				result.updateOne({ $set: { 'reservations': result.reservations } }, (err, finalResult) => {
					if (err) {
						res.status(500).send({ error: 'Server error. Could not delete reservation.' })
					}
					else {
						if (finalResult) {
							res.send({ reservation: temp, restaurant: result })
						}
						else {
							res.status(500).send({ message: "Server error. Could not delete reservation." })
						}
					}
				});
			}
			else {
				res.status(404).send({ error: 'Restaurant not found.' })
			}
		}
	});
});


/// Route for changing reservation information
/* 
Request body expects:
{
	"time": <time>
	"people": <number of people>
}
*/
// Returned JSON should have the restaurant database
//   document in which the reservation was changed, AND the reservation subdocument changed:
//   { "reservation": <reservation subdocument>, "restaurant": <entire restaurant document>}
// PATCH restaurant/<restaurant_id>/<reservation_id>
app.patch('/restaurants/:id/:resv_id', (req, res) => {
	// Add code here
	const restId = req.params.id;
	const resvId = req.params.resv_id;
	Restaurant.findOne({ '_id': restId }, (error, result) => {
		if (error) {
			res.send({ error: 'Server error. Could not update reservation.' })
		}
		else {
			if (result) {
				const oldResvList = result.reservations;
				const tempResvList = oldResvList.filter(el => el._id == resvId);
				const resvToUpdate = tempResvList[0];
				const newResvList = oldResvList.filter(el => el._id != resvId);

				resvToUpdate.time = req.body.time;
				resvToUpdate.people = req.body.people;

				newResvList.push(resvToUpdate);

				result.reservations = newResvList;

				result.updateOne({ $set: { 'reservations': result.reservations } }, (err, finalResult) => {
					if (err) {
						res.status(500).send({ error: 'Server error. Could not update reservation.' })
					}
					else {
						if (finalResult) {
							res.send({ reservation: resvToUpdate, restaurant: result })
						}
						else {
							res.status(500).send({ message: "Server error. Could not update reservation." })
						}
					}
				});
			}
			else {
				res.status(404).send({ error: 'Restaurant not found.' })
			}
		}
	});
});


////////// DO NOT CHANGE THE CODE OR PORT NUMBER BELOW
const port = process.env.PORT || 3001
app.listen(port, () => {
	log(`Listening on port ${port}...`)
});
