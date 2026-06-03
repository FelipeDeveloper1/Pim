const dog = {
    nome: "max",
    idade: 18
}


for (const [key, value] of Object.entries(dog)) {
    console.log(key, value)
}

const alldata = []
const factory = (name) => {
    const tag = {}
    tag.name = name
    alldata.push(tag)
}


factory("fleec")
factory("max")
factory("fiona")
factory("saphira")
factory("ori")
console.log(alldata[1])