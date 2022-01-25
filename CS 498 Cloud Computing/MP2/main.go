package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()
	value := &struct{ Num int }{}
	r.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})
	r.Methods("GET").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := w.Write([]byte(strconv.Itoa(value.Num)))
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
	})

	r.Methods("POST").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		err = json.Unmarshal(body, value)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	})

	err := http.ListenAndServe(":80", r)
	if err != nil {
		panic(err)
	}
	select {}
}
