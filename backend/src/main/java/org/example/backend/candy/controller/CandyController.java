package org.example.backend.candy.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.candy.dto.CandyRequest;
import org.example.backend.candy.entity.Candy;
import org.example.backend.candy.service.CandyService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/candies")
@RequiredArgsConstructor
public class CandyController {

    private final CandyService candyService;

    @GetMapping
    public List<Candy> findAll() {
        return candyService.findAll();
    }

    @GetMapping("/{id}")
    public Candy findById(@PathVariable Long id) {
        return candyService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Candy not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Candy create(@RequestBody CandyRequest req) {
        return candyService.create(req);
    }

    @PutMapping("/{id}")
    public Candy update(@PathVariable Long id, @RequestBody CandyRequest req) {
        return candyService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        candyService.deleteById(id);
    }
}
