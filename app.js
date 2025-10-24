const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const date = require(__dirname + "/date.js");
const dotenv =require("dotenv");
dotenv.config();


const uri = process.env.MONGO_URI;



const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


//mongoose connection

main().catch(err => console.log(err));

async function main() {
await mongoose.connect(uri);
}

const medSchema = new mongoose.Schema({
    medName: {
        type: String,
        required: true
    },
    entryDate: {
        type: Date,
        required: true,
    },
    expiryDate: {
        type: Date,
        required: true
    },
    units: {
        type: BigInt,
        required: true
    }
});
 const depSchema =  {
    department: String,
    meds: [medSchema],
 }

const Med = new mongoose.model("Med",medSchema); 
const Department = new mongoose.model("Department",depSchema);

const Opthanology = new Department({
    department: 'Opthanology',
});
// Opthanology.save();
const ENT = new Department({
    department: 'ENT',
});
// ENT.save();
const Cardiology = new Department({
    department: 'Cardiology',
});
// Cardiology.save();
const Neurology = new Department({
    department: 'Neurology',
});
// Neurology.save();
const Orthopaedics = new Department({
    department: 'Orthopaedics',
});
// Orthopaedics.save();
const   Dermatology = new Department({
    department: 'Dermatology',
});
// Dermatology.save();
const Respiratory = new Department({
    department: 'Respiratory',
});
// Respiratory.save();
const Surgical = new Department({
    department: 'Surgical',
});
// Surgical.save();
const Gastroenterology = new  Department({
    department: 'Gastroenterology',
});
// Gastroenterology.save();


// Home
app.get("/",function(req,res){
    res.render("home");
});


// Sell
app.get("/sell",function(req,res){
    res.render("sell");
});
app.post("/sell", function (req, res) {
    const medname = _.capitalize(req.body.medName);
    let unitsToSell = BigInt(req.body.units);

    const depname = _.toUpper(req.body.department) === "ENT"
        ? _.toUpper(req.body.department)
        : _.capitalize(req.body.department);

    Department.findOne({ department: depname })
        .then((foundDep) => {
            if (!foundDep) {
                console.error("Department not found:", depname); // Log missing department
                return res.send(`
                    <script>
                        alert("Department '${depname}' not found!");
                        window.location.href = '/sell';
                    </script>
                `);
            }

            const foundMeds = foundDep.meds.filter((med) => _.toLower(med.medName) === _.toLower(medname));
            if (foundMeds.length === 0) {
                console.error("Medicine not found:", medname); // Log missing medicine
                return res.send(`
                    <script>
                        alert("Med with the name '${medname}' not found!");
                        window.location.href = '/sell';
                    </script>
                `);
            }

            let totalUnitsSold = BigInt(0);

            foundDep.meds = foundDep.meds.filter((med) => {
                if (_.toLower(med.medName) === _.toLower(medname)) {
                    let availableUnits = med.units;

                    const date1 = date();
                    const date2 = new Date(med.expiryDate); 
                    const diffTime = (date2 - date1);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if(diffDays > 0 ) //Chech the medicine is not expired
                    {
                        if (unitsToSell >= availableUnits) {
                            totalUnitsSold += availableUnits;
                            unitsToSell -= availableUnits;
                            return false; // Remove this medicine
                        } else {
                            med.units -= unitsToSell;
                            totalUnitsSold += unitsToSell;
                            unitsToSell = 0;
                        }

                    }
                    
                }
                return true; // Keep this medicine
            });

            if (unitsToSell > 0) {
                console.log("Not enough stock. Total units sold:", totalUnitsSold); // not enough stock available
                return res.send(`
                    <script>
                        alert("Not enough stock! (ONLY ${totalUnitsSold} units available).");
                        window.location.href = '/sell';
                    </script>
                `);
            }

            foundDep.save()
                .then(() => {
                    res.send(`
                        <script>
                            alert("Sold ${totalUnitsSold} units of '${medname}'!");
                            window.location.href = '/sell';
                        </script>
                    `);
                })
                .catch((err) => {
                    console.error("Error saving department:", err);
                    res.status(500).send("Error saving department.");
                });
        })
        .catch((err) => {
            console.error("Error finding department:", err); // Improved logging
            res.status(500).send("Error finding department.");
        });
});




// Edit Stock
app.get("/edit",function(req,res){
    res.render("editStock", { department: null,id : null ,selectedOption: null });
});
app.post("/edit", function (req, res) {
    const Id = req.body.id;
    const option = req.body.option;
    const newValueInput = req.body.newValue;

    // Determine department name format
    
    let depname;
    if(_.toUpper(req.body.department) === "ENT")
    {
        depname = _.toUpper(req.body.department);
    }
    else{
        depname = _.capitalize(req.body.department);
    }

    // Fetch department from database
    Department.findOne({ department: depname })
        .then((foundDep) => {
            if (!foundDep) {
                return res.send(`
                    <script>
                        alert("Department ${depname} not found!");
                        window.location.href = '/edit';
                    </script>
                `);  // Only send response once
            }

            const medicine = foundDep.meds;
            const foundMed = medicine.find((med) => med._id.toString() === Id);

            if (!foundMed) {
                return res.send(`
                    <script>
                        alert("Med with the ID ${Id} not found!");
                        window.location.href = '/edit';
                    </script>
                `);  // Only send response once
            }

            // Handle removal if "remove" option is selected
            if (option === "remove") {
                foundDep.meds.pull({ _id: Id });
                foundDep.save()
                    .then(() => {
                        return res.send(`
                            <script>
                                alert("Med with ID ${Id} Removed successfully!");
                                window.location.href = '/edit';
                            </script>
                        `);  // Only send response once after removal
                    })
                    .catch((err) => {
                        console.error(err);
                        return res.status(500).send("Error removing the medicine.");
                    });
                return; // Ensure no further code executes after removal
            }

            // If no new value provided, render the editStock page
            if (!newValueInput) {
                return res.render("editStock", {  // Only render once
                    department: depname,
                    id: Id,
                    selectedOption: option
                });
            }

            // Prepare the new value
            const newValue = option === "medName"
                ? _.capitalize(newValueInput)
                : newValueInput;

            console.log("Updating:", { option, newValue });

            // Update the selected field and save the department
            foundMed[option] = newValue;
            foundDep.save()
                .then(() => {
                    return res.send(`
                        <script>
                            alert("Med with ID ${Id} Edited successfully!");
                            window.location.href = '/edit';
                        </script>
                    `);  // Only send response once after update
                })
                .catch((err) => {
                    console.error(err);
                    return res.status(500).send("Error saving the updated medicine.");
                });
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).send("Error fetching department.");
        });
});


// Restock
app.get("/restock",function(req,res){
    res.render("restock");
});
app.post("/restock",function(req,res){
   
    let depname;
    if(_.toUpper(req.body.department) === "ENT")
    {
        depname = _.toUpper(req.body.department);
    }
    else{
        depname = _.capitalize(req.body.department);
    }
    const medname=_.capitalize(req.body.medName);
    const entry=req.body.entryDate;
    const expiry=req.body.expiryDate;
    const unit = req.body.units;

    const newMed =new Med({
        medName: medname,
        entryDate: entry,
        expiryDate: expiry,
        units: unit
    });

    Department.findOne({department: depname})
    .then(foundDep => {
        if(!foundDep)
        {
            res.write(`
                <script>
                    alert("Department not found!");
                    window.location.href = '/restock';
                </script>
            `);
        }else{
            const medicine = foundDep.meds.find(
                med =>
                  med.medName === medname &&
                  med.entryDate.getTime() === new Date(entry).getTime() &&
                  med.expiryDate.getTime() === new Date(expiry).getTime()
              );
        
              if (medicine) {
                // Update the units of the specific medicine
                    medicine.units = BigInt(medicine.units) + BigInt(unit);
                }

                else{
                    foundDep.meds.push(newMed);
                }
                foundDep.save();
                res.write(`
                    <script>
                        alert("Item Added!");
                        window.location.href = '/restock';
                    </script>
                `);
            }
            res.send();
      })
      .catch(err => {
        console.error(err);
      });
          
});



// View Stock 
app.get("/view",function(req,res){
    res.render("viewStock");
});
app.post("/view",function(req,res){
    
});

app.get("/viewing",function(req,res){
    res.render("viewing",{department: "No stock found!",stock: []});
});
app.post("/viewing",function(req,res){
    let depname;
    if(_.toUpper(req.body.department) === "ENT")
    {
        depname = _.toUpper(req.body.department);
    }
    else{
        depname = _.capitalize(req.body.department);
    }

    Department.findOne({department: depname})
    .then(dep =>{
        if(dep)
        {
            if(Array.isArray(dep.meds) && dep.meds.length > 0)
                {
                    res.render("viewing",{department: dep.department,stock: dep.meds || [],date: date});
                }
                else{
                    res.render("viewing",{department: dep.department,stock: [],date: date});
                }
        }
        else{
            res.render("viewing",{department:"No department found!",stock:[],date: date});
        }
        
    })
    .catch(err =>{
        console.error(err);
    });
});



app.listen(process.env.PORT || 3000, function() {
    console.log("Server started on port 3000");
  });
